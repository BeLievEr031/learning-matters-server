import { eq, isNull, and, or, lt, desc, asc, ilike } from 'drizzle-orm';
import { db } from '../../db/pool.js';
import { grades, type Grade, type GradeStatus } from '../../db/schema/grades.js';
import type { CursorPayload } from '../../lib/pagination.js';
import type { GRADE_SORT_FIELDS } from './grades.schemas.js';

export interface GradeFilters {
  status?: GradeStatus | undefined;
  section?: string | undefined;
  gradeNumber?: number | undefined;
  search?: string | undefined;
  sortBy?: (typeof GRADE_SORT_FIELDS)[number] | undefined;
  sortOrder?: 'asc' | 'desc' | undefined;
}

export interface CreateGradeData {
  schoolId: string;
  boardId: string;
  name: string;
  code: string;
  gradeNumber: number;
  section?: string | null | undefined;
  capacity?: number | null | undefined;
  status?: GradeStatus | undefined;
}

export interface UpdateGradeData {
  name?: string | undefined;
  code?: string | undefined;
  gradeNumber?: number | undefined;
  section?: string | null | undefined;
  capacity?: number | null | undefined;
  status?: GradeStatus | undefined;
}

export class GradesRepository {
  /**
   * Find a grade by ID, excluding soft-deleted records by default.
   */
  async findById(id: string, includeDeleted = false): Promise<Grade | null> {
    const conditions = [eq(grades.id, id)];
    if (!includeDeleted) {
      conditions.push(isNull(grades.deletedAt));
    }

    const rows = await db
      .select()
      .from(grades)
      .where(and(...conditions))
      .limit(1);

    return rows[0] ?? null;
  }

  /**
   * Find a grade by board ID, grade number, and section (case-insensitive for section).
   */
  async findByBoardGradeAndSection(
    boardId: string,
    gradeNumber: number,
    section?: string | null,
    includeDeleted = false,
  ): Promise<Grade | null> {
    const conditions = [eq(grades.boardId, boardId), eq(grades.gradeNumber, gradeNumber)];

    if (!includeDeleted) {
      conditions.push(isNull(grades.deletedAt));
    }

    if (section && section.trim().length > 0) {
      conditions.push(ilike(grades.section, section.trim()));
    } else {
      const emptySection = or(isNull(grades.section), eq(grades.section, ''));
      if (emptySection) {
        conditions.push(emptySection);
      }
    }

    const rows = await db
      .select()
      .from(grades)
      .where(and(...conditions))
      .limit(1);

    return rows[0] ?? null;
  }

  /**
   * Create a new grade record.
   */
  async create(data: CreateGradeData): Promise<Grade> {
    const rows = await db
      .insert(grades)
      .values({
        schoolId: data.schoolId,
        boardId: data.boardId,
        name: data.name.trim(),
        code: data.code.trim().toUpperCase(),
        gradeNumber: data.gradeNumber,
        section: data.section ? data.section.trim().toUpperCase() : null,
        ...(data.capacity !== undefined && { capacity: data.capacity }),
        ...(data.status !== undefined && { status: data.status }),
      })
      .returning();

    const created = rows[0];
    if (!created) {
      throw new Error('Failed to create grade record');
    }
    return created;
  }

  /**
   * Update an existing grade.
   */
  async update(id: string, data: UpdateGradeData): Promise<Grade | null> {
    const updateValues: Record<string, unknown> = {};

    if (data.name !== undefined) {
      updateValues.name = data.name.trim();
    }
    if (data.code !== undefined) {
      updateValues.code = data.code.trim().toUpperCase();
    }
    if (data.gradeNumber !== undefined) {
      updateValues.gradeNumber = data.gradeNumber;
    }
    if (data.section !== undefined) {
      updateValues.section = data.section ? data.section.trim().toUpperCase() : null;
    }
    if (data.capacity !== undefined) {
      updateValues.capacity = data.capacity;
    }
    if (data.status !== undefined) {
      updateValues.status = data.status;
    }

    if (Object.keys(updateValues).length === 0) {
      return this.findById(id);
    }

    const rows = await db
      .update(grades)
      .set(updateValues)
      .where(and(eq(grades.id, id), isNull(grades.deletedAt)))
      .returning();

    return rows[0] ?? null;
  }

  /**
   * Soft-delete a grade by setting deletedAt timestamp.
   */
  async softDelete(id: string): Promise<boolean> {
    const rows = await db
      .update(grades)
      .set({ deletedAt: new Date() })
      .where(and(eq(grades.id, id), isNull(grades.deletedAt)))
      .returning({ id: grades.id });

    return rows.length > 0;
  }

  /**
   * Assign or remove the class teacher for a grade.
   */
  async setClassTeacher(gradeId: string, teacherId: string | null): Promise<Grade | null> {
    const rows = await db
      .update(grades)
      .set({ classTeacherId: teacherId, updatedAt: new Date() })
      .where(and(eq(grades.id, gradeId), isNull(grades.deletedAt)))
      .returning();

    return rows[0] ?? null;
  }

  /**
   * Cursor-paginated list of grades for a board ordered by (createdAt DESC, id DESC).
   * Fetches (limit + 1) rows to determine hasMore and nextCursor.
   */
  async listByBoard(
    boardId: string,
    limit: number,
    cursor?: CursorPayload,
    filters?: GradeFilters,
  ): Promise<Grade[]> {
    const conditions = [eq(grades.boardId, boardId), isNull(grades.deletedAt)];

    if (filters?.status) {
      conditions.push(eq(grades.status, filters.status));
    }

    if (filters?.gradeNumber !== undefined) {
      conditions.push(eq(grades.gradeNumber, filters.gradeNumber));
    }

    if (filters?.section && filters.section.trim().length > 0) {
      conditions.push(ilike(grades.section, filters.section.trim()));
    }

    if (filters?.search && filters.search.trim().length > 0) {
      const pattern = `%${filters.search.trim()}%`;
      const searchCondition = or(ilike(grades.name, pattern), ilike(grades.code, pattern));
      if (searchCondition) {
        conditions.push(searchCondition);
      }
    }

    if (cursor) {
      const cursorCondition = or(
        lt(grades.createdAt, cursor.createdAt),
        and(eq(grades.createdAt, cursor.createdAt), lt(grades.id, cursor.id)),
      );
      if (cursorCondition) {
        conditions.push(cursorCondition);
      }
    }

    let primaryOrder = desc(grades.createdAt);
    if (filters?.sortBy === 'name') {
      primaryOrder = filters.sortOrder === 'asc' ? asc(grades.name) : desc(grades.name);
    } else if (filters?.sortBy === 'code') {
      primaryOrder = filters.sortOrder === 'asc' ? asc(grades.code) : desc(grades.code);
    } else if (filters?.sortBy === 'gradeNumber') {
      primaryOrder =
        filters.sortOrder === 'asc' ? asc(grades.gradeNumber) : desc(grades.gradeNumber);
    } else if (filters?.sortBy === 'status') {
      primaryOrder = filters.sortOrder === 'asc' ? asc(grades.status) : desc(grades.status);
    } else if (filters?.sortBy === 'createdAt') {
      primaryOrder = filters.sortOrder === 'asc' ? asc(grades.createdAt) : desc(grades.createdAt);
    }

    return db
      .select()
      .from(grades)
      .where(and(...conditions))
      .orderBy(primaryOrder, desc(grades.id))
      .limit(limit + 1);
  }

  /**
   * Check if any active grades exist under a given board.
   */
  async hasActiveGradesByBoard(boardId: string): Promise<boolean> {
    const rows = await db
      .select({ id: grades.id })
      .from(grades)
      .where(
        and(eq(grades.boardId, boardId), isNull(grades.deletedAt), eq(grades.status, 'active')),
      )
      .limit(1);

    return rows.length > 0;
  }
}

export const gradesRepository = new GradesRepository();
