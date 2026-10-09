import { eq, isNull, and, or, lt, desc, asc, ilike } from 'drizzle-orm';
import { db } from '../../db/pool.js';
import { boards, type Board, type BoardStatus } from '../../db/schema/boards.js';
import type { CursorPayload } from '../../lib/pagination.js';
import type { BOARD_SORT_FIELDS } from './boards.schemas.js';

export interface BoardFilters {
  status?: BoardStatus | undefined;
  search?: string | undefined;
  sortBy?: (typeof BOARD_SORT_FIELDS)[number] | undefined;
  sortOrder?: 'asc' | 'desc' | undefined;
}

export interface CreateBoardData {
  schoolId: string;
  name: string;
  code: string;
  description?: string | null | undefined;
  status?: BoardStatus | undefined;
}

export interface UpdateBoardData {
  name?: string | undefined;
  code?: string | undefined;
  description?: string | null | undefined;
  status?: BoardStatus | undefined;
}

export class BoardsRepository {
  /**
   * Find a board by ID, excluding soft-deleted records by default.
   */
  async findById(id: string, includeDeleted = false): Promise<Board | null> {
    const conditions = [eq(boards.id, id)];
    if (!includeDeleted) {
      conditions.push(isNull(boards.deletedAt));
    }

    const rows = await db
      .select()
      .from(boards)
      .where(and(...conditions))
      .limit(1);

    return rows[0] ?? null;
  }

  /**
   * Find a board by school ID and code (case-insensitive), excluding soft-deleted records by default.
   */
  async findBySchoolAndCode(
    schoolId: string,
    code: string,
    includeDeleted = false,
  ): Promise<Board | null> {
    const conditions = [eq(boards.schoolId, schoolId), ilike(boards.code, code.trim())];
    if (!includeDeleted) {
      conditions.push(isNull(boards.deletedAt));
    }

    const rows = await db
      .select()
      .from(boards)
      .where(and(...conditions))
      .limit(1);

    return rows[0] ?? null;
  }

  /**
   * Create a new board record.
   */
  async create(data: CreateBoardData): Promise<Board> {
    const rows = await db
      .insert(boards)
      .values({
        schoolId: data.schoolId,
        name: data.name.trim(),
        code: data.code.trim().toUpperCase(),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.status !== undefined && { status: data.status }),
      })
      .returning();

    const created = rows[0];
    if (!created) {
      throw new Error('Failed to create board record');
    }
    return created;
  }

  /**
   * Update an existing board.
   */
  async update(id: string, data: UpdateBoardData): Promise<Board | null> {
    const updateValues: Record<string, unknown> = {};

    if (data.name !== undefined) {
      updateValues.name = data.name.trim();
    }
    if (data.code !== undefined) {
      updateValues.code = data.code.trim().toUpperCase();
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
      .update(boards)
      .set(updateValues)
      .where(and(eq(boards.id, id), isNull(boards.deletedAt)))
      .returning();

    return rows[0] ?? null;
  }

  /**
   * Soft-delete a board by setting deletedAt timestamp.
   */
  async softDelete(id: string): Promise<boolean> {
    const rows = await db
      .update(boards)
      .set({ deletedAt: new Date() })
      .where(and(eq(boards.id, id), isNull(boards.deletedAt)))
      .returning({ id: boards.id });

    return rows.length > 0;
  }

  /**
   * Cursor-paginated list of boards for a school ordered by (createdAt DESC, id DESC).
   * Fetches (limit + 1) rows to determine hasMore and nextCursor.
   */
  async listBySchool(
    schoolId: string,
    limit: number,
    cursor?: CursorPayload,
    filters?: BoardFilters,
  ): Promise<Board[]> {
    const conditions = [eq(boards.schoolId, schoolId), isNull(boards.deletedAt)];

    if (filters?.status) {
      conditions.push(eq(boards.status, filters.status));
    }

    if (filters?.search && filters.search.trim().length > 0) {
      const pattern = `%${filters.search.trim()}%`;
      const searchCondition = or(ilike(boards.name, pattern), ilike(boards.code, pattern));
      if (searchCondition) {
        conditions.push(searchCondition);
      }
    }

    if (cursor) {
      const cursorCondition = or(
        lt(boards.createdAt, cursor.createdAt),
        and(eq(boards.createdAt, cursor.createdAt), lt(boards.id, cursor.id)),
      );
      if (cursorCondition) {
        conditions.push(cursorCondition);
      }
    }

    let primaryOrder = desc(boards.createdAt);
    if (filters?.sortBy === 'name') {
      primaryOrder = filters.sortOrder === 'asc' ? asc(boards.name) : desc(boards.name);
    } else if (filters?.sortBy === 'code') {
      primaryOrder = filters.sortOrder === 'asc' ? asc(boards.code) : desc(boards.code);
    } else if (filters?.sortBy === 'status') {
      primaryOrder = filters.sortOrder === 'asc' ? asc(boards.status) : desc(boards.status);
    } else if (filters?.sortBy === 'createdAt') {
      primaryOrder = filters.sortOrder === 'asc' ? asc(boards.createdAt) : desc(boards.createdAt);
    }

    return db
      .select()
      .from(boards)
      .where(and(...conditions))
      .orderBy(primaryOrder, desc(boards.id))
      .limit(limit + 1);
  }
}

export const boardsRepository = new BoardsRepository();
