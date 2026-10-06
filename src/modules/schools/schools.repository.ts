import { eq, isNull, and, or, lt, desc, ilike } from 'drizzle-orm';
import { db } from '../../db/pool.js';
import { schools, type School, type SchoolStatus } from '../../db/schema/schools.js';
import type { CursorPayload } from '../../lib/pagination.js';

export interface SchoolFilters {
  status?: SchoolStatus | undefined;
  search?: string | undefined;
}

export interface CreateSchoolData {
  name: string;
  code: string;
  address?: string | null | undefined;
  city?: string | null | undefined;
  state?: string | null | undefined;
  country?: string | null | undefined;
  phone?: string | null | undefined;
  email?: string | null | undefined;
  website?: string | null | undefined;
  logoUrl?: string | null | undefined;
  status?: SchoolStatus | undefined;
}

export interface UpdateSchoolData {
  name?: string | undefined;
  code?: string | undefined;
  address?: string | null | undefined;
  city?: string | null | undefined;
  state?: string | null | undefined;
  country?: string | null | undefined;
  phone?: string | null | undefined;
  email?: string | null | undefined;
  website?: string | null | undefined;
  logoUrl?: string | null | undefined;
  status?: SchoolStatus | undefined;
}

export class SchoolsRepository {
  /**
   * Find a school by ID, excluding soft-deleted records by default.
   */
  async findById(id: string, includeDeleted = false): Promise<School | null> {
    const conditions = [eq(schools.id, id)];
    if (!includeDeleted) {
      conditions.push(isNull(schools.deletedAt));
    }

    const rows = await db
      .select()
      .from(schools)
      .where(and(...conditions))
      .limit(1);

    return rows[0] ?? null;
  }

  /**
   * Find a school by code (case-insensitive), excluding soft-deleted records by default.
   */
  async findByCode(code: string, includeDeleted = false): Promise<School | null> {
    const conditions = [ilike(schools.code, code.trim())];
    if (!includeDeleted) {
      conditions.push(isNull(schools.deletedAt));
    }

    const rows = await db
      .select()
      .from(schools)
      .where(and(...conditions))
      .limit(1);

    return rows[0] ?? null;
  }

  /**
   * Create a new school.
   */
  async create(data: CreateSchoolData): Promise<School> {
    const rows = await db
      .insert(schools)
      .values({
        name: data.name.trim(),
        code: data.code.trim().toUpperCase(),
        ...(data.address !== undefined && { address: data.address }),
        ...(data.city !== undefined && { city: data.city }),
        ...(data.state !== undefined && { state: data.state }),
        ...(data.country !== undefined && { country: data.country }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.email !== undefined && { email: data.email?.toLowerCase() }),
        ...(data.website !== undefined && { website: data.website }),
        ...(data.logoUrl !== undefined && { logoUrl: data.logoUrl }),
        ...(data.status !== undefined && { status: data.status }),
      })
      .returning();

    const created = rows[0];
    if (!created) {
      throw new Error('Failed to create school record');
    }
    return created;
  }

  /**
   * Update an existing school.
   */
  async update(id: string, data: UpdateSchoolData): Promise<School | null> {
    const updateValues: Record<string, unknown> = {};

    if (data.name !== undefined) {
      updateValues.name = data.name.trim();
    }
    if (data.code !== undefined) {
      updateValues.code = data.code.trim().toUpperCase();
    }
    if (data.address !== undefined) {
      updateValues.address = data.address;
    }
    if (data.city !== undefined) {
      updateValues.city = data.city;
    }
    if (data.state !== undefined) {
      updateValues.state = data.state;
    }
    if (data.country !== undefined) {
      updateValues.country = data.country;
    }
    if (data.phone !== undefined) {
      updateValues.phone = data.phone;
    }
    if (data.email !== undefined) {
      updateValues.email = data.email?.toLowerCase();
    }
    if (data.website !== undefined) {
      updateValues.website = data.website;
    }
    if (data.logoUrl !== undefined) {
      updateValues.logoUrl = data.logoUrl;
    }
    if (data.status !== undefined) {
      updateValues.status = data.status;
    }

    if (Object.keys(updateValues).length === 0) {
      return this.findById(id);
    }

    const rows = await db
      .update(schools)
      .set(updateValues)
      .where(and(eq(schools.id, id), isNull(schools.deletedAt)))
      .returning();

    return rows[0] ?? null;
  }

  /**
   * Soft-delete a school by populating deletedAt timestamp.
   */
  async softDelete(id: string): Promise<boolean> {
    const rows = await db
      .update(schools)
      .set({ deletedAt: new Date() })
      .where(and(eq(schools.id, id), isNull(schools.deletedAt)))
      .returning({ id: schools.id });

    return rows.length > 0;
  }

  /**
   * Cursor-paginated list of non-deleted schools ordered by (createdAt DESC, id DESC).
   * Fetches (limit + 1) rows to determine hasMore and nextCursor.
   */
  async list(limit: number, cursor?: CursorPayload, filters?: SchoolFilters): Promise<School[]> {
    const conditions = [isNull(schools.deletedAt)];

    if (filters?.status) {
      conditions.push(eq(schools.status, filters.status));
    }

    if (filters?.search && filters.search.trim().length > 0) {
      const pattern = `%${filters.search.trim()}%`;
      const searchCondition = or(ilike(schools.name, pattern), ilike(schools.code, pattern));
      if (searchCondition) {
        conditions.push(searchCondition);
      }
    }

    if (cursor) {
      const cursorCondition = or(
        lt(schools.createdAt, cursor.createdAt),
        and(eq(schools.createdAt, cursor.createdAt), lt(schools.id, cursor.id)),
      );
      if (cursorCondition) {
        conditions.push(cursorCondition);
      }
    }

    return db
      .select()
      .from(schools)
      .where(and(...conditions))
      .orderBy(desc(schools.createdAt), desc(schools.id))
      .limit(limit + 1);
  }
}

export const schoolsRepository = new SchoolsRepository();
