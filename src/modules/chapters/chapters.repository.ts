import { eq, isNull, and, or, lt, desc, asc, ilike, sql } from 'drizzle-orm';
import { db } from '../../db/pool.js';
import { chapters, type Chapter, type ChapterStatus } from '../../db/schema/chapters.js';
import type { CursorPayload } from '../../lib/pagination.js';
import type { CHAPTER_SORT_FIELDS } from './chapters.schemas.js';

export interface ChapterFilters {
  status?: ChapterStatus | undefined;
  search?: string | undefined;
  sortBy?: (typeof CHAPTER_SORT_FIELDS)[number] | undefined;
  sortOrder?: 'asc' | 'desc' | undefined;
}

export interface CreateChapterData {
  schoolId: string;
  subjectId: string;
  chapterNumber: number;
  title: string;
  description?: string | null | undefined;
  status?: ChapterStatus | undefined;
}

export interface UpdateChapterData {
  chapterNumber?: number | undefined;
  title?: string | undefined;
  description?: string | null | undefined;
  status?: ChapterStatus | undefined;
}

export class ChaptersRepository {
  /**
   * Find a chapter by ID, excluding soft-deleted records by default.
   */
  async findById(id: string, includeDeleted = false): Promise<Chapter | null> {
    const conditions = [eq(chapters.id, id)];
    if (!includeDeleted) {
      conditions.push(isNull(chapters.deletedAt));
    }

    const rows = await db
      .select()
      .from(chapters)
      .where(and(...conditions))
      .limit(1);

    return rows[0] ?? null;
  }

  /**
   * Find a chapter by subject ID and chapterNumber.
   */
  async findBySubjectAndNumber(
    subjectId: string,
    chapterNumber: number,
    includeDeleted = false,
  ): Promise<Chapter | null> {
    const conditions = [
      eq(chapters.subjectId, subjectId),
      eq(chapters.chapterNumber, chapterNumber),
    ];
    if (!includeDeleted) {
      conditions.push(isNull(chapters.deletedAt));
    }

    const rows = await db
      .select()
      .from(chapters)
      .where(and(...conditions))
      .limit(1);

    return rows[0] ?? null;
  }

  /**
   * Create a new chapter.
   */
  async create(data: CreateChapterData): Promise<Chapter> {
    const rows = await db
      .insert(chapters)
      .values({
        schoolId: data.schoolId,
        subjectId: data.subjectId,
        chapterNumber: data.chapterNumber,
        title: data.title.trim(),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.status !== undefined && { status: data.status }),
      })
      .returning();

    const created = rows[0];
    if (!created) {
      throw new Error('Failed to create chapter record');
    }
    return created;
  }

  /**
   * Update an existing chapter.
   */
  async update(id: string, data: UpdateChapterData): Promise<Chapter | null> {
    const updateValues: Record<string, unknown> = {};

    if (data.chapterNumber !== undefined) {
      updateValues.chapterNumber = data.chapterNumber;
    }
    if (data.title !== undefined) {
      updateValues.title = data.title.trim();
    }
    if (data.description !== undefined) {
      updateValues.description = data.description;
    }
    if (data.status !== undefined) {
      updateValues.status = data.status;
    }

    if (Object.keys(updateValues).length === 0) {
      return this.findById(id);
    }

    const rows = await db
      .update(chapters)
      .set(updateValues)
      .where(and(eq(chapters.id, id), isNull(chapters.deletedAt)))
      .returning();

    return rows[0] ?? null;
  }

  /**
   * Soft delete a chapter.
   */
  async softDelete(id: string): Promise<boolean> {
    const rows = await db
      .update(chapters)
      .set({ deletedAt: new Date() })
      .where(and(eq(chapters.id, id), isNull(chapters.deletedAt)))
      .returning({ id: chapters.id });

    return rows.length > 0;
  }

  /**
   * Cascade soft delete all chapters under a subject.
   */
  async cascadeSoftDeleteBySubject(subjectId: string): Promise<number> {
    const rows = await db
      .update(chapters)
      .set({ deletedAt: new Date() })
      .where(and(eq(chapters.subjectId, subjectId), isNull(chapters.deletedAt)))
      .returning({ id: chapters.id });

    return rows.length;
  }

  /**
   * List chapters under a subject with cursor-based pagination and filters.
   */
  async listBySubject(
    subjectId: string,
    limit: number,
    cursor?: CursorPayload,
    filters?: ChapterFilters,
  ): Promise<Chapter[]> {
    const conditions = [eq(chapters.subjectId, subjectId), isNull(chapters.deletedAt)];

    if (filters?.status) {
      conditions.push(eq(chapters.status, filters.status));
    }

    if (filters?.search && filters.search.trim().length > 0) {
      const pattern = `%${filters.search.trim()}%`;
      const searchCondition = or(
        ilike(chapters.title, pattern),
        ilike(chapters.description, pattern),
      );
      if (searchCondition) {
        conditions.push(searchCondition);
      }
    }

    if (cursor) {
      const cursorCondition = or(
        lt(chapters.createdAt, cursor.createdAt),
        and(eq(chapters.createdAt, cursor.createdAt), lt(chapters.id, cursor.id)),
      );
      if (cursorCondition) {
        conditions.push(cursorCondition);
      }
    }

    let primaryOrder = asc(chapters.chapterNumber);
    if (filters?.sortBy === 'title') {
      primaryOrder = filters.sortOrder === 'desc' ? desc(chapters.title) : asc(chapters.title);
    } else if (filters?.sortBy === 'status') {
      primaryOrder = filters.sortOrder === 'desc' ? desc(chapters.status) : asc(chapters.status);
    } else if (filters?.sortBy === 'createdAt') {
      primaryOrder =
        filters.sortOrder === 'desc' ? desc(chapters.createdAt) : asc(chapters.createdAt);
    } else if (filters?.sortBy === 'chapterNumber') {
      primaryOrder =
        filters.sortOrder === 'desc' ? desc(chapters.chapterNumber) : asc(chapters.chapterNumber);
    }

    const rows = await db
      .select()
      .from(chapters)
      .where(and(...conditions))
      .orderBy(primaryOrder, asc(chapters.id))
      .limit(limit + 1);

    return rows;
  }

  /**
   * Batch reorder chapter numbers for a given subject inside a transaction.
   */
  async reorder(
    subjectId: string,
    items: { id: string; chapterNumber: number }[],
  ): Promise<Chapter[]> {
    return await db.transaction(async (tx) => {
      // Step 1: temporarily negate numbers to avoid unique constraint violations
      for (const item of items) {
        await tx
          .update(chapters)
          .set({ chapterNumber: sql`-(${item.chapterNumber} + 1000000)` })
          .where(and(eq(chapters.id, item.id), eq(chapters.subjectId, subjectId)));
      }

      // Step 2: assign final target numbers
      for (const item of items) {
        await tx
          .update(chapters)
          .set({ chapterNumber: item.chapterNumber })
          .where(and(eq(chapters.id, item.id), eq(chapters.subjectId, subjectId)));
      }

      // Return refreshed list of updated chapters
      const rows = await tx
        .select()
        .from(chapters)
        .where(and(eq(chapters.subjectId, subjectId), isNull(chapters.deletedAt)))
        .orderBy(asc(chapters.chapterNumber));

      return rows;
    });
  }

  /**
   * Count active chapters for a subject.
   */
  async countBySubject(subjectId: string, includeDeleted = false): Promise<number> {
    const conditions = [eq(chapters.subjectId, subjectId)];
    if (!includeDeleted) {
      conditions.push(isNull(chapters.deletedAt));
    }

    const rows = await db
      .select({ count: sql<number>`count(*)` })
      .from(chapters)
      .where(and(...conditions));

    return rows[0]?.count ?? 0;
  }
}

export const chaptersRepository = new ChaptersRepository();
