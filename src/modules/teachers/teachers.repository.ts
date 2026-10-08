import { eq, isNull, and, or, lt, desc, ilike, sql } from 'drizzle-orm';
import { db } from '../../db/pool.js';
import { teachers, type Teacher, type TeacherStatus } from '../../db/schema/teachers.js';
import type { CursorPayload } from '../../lib/pagination.js';

export interface TeacherFilters {
  status?: TeacherStatus | undefined;
  search?: string | undefined;
}

export interface CreateTeacherData {
  schoolId: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null | undefined;
  userId?: string | null | undefined;
  joiningDate?: Date | null | undefined;
  qualification?: string | null | undefined;
  status?: TeacherStatus | undefined;
}

export interface UpdateTeacherData {
  employeeId?: string | undefined;
  firstName?: string | undefined;
  lastName?: string | undefined;
  email?: string | undefined;
  phone?: string | null | undefined;
  userId?: string | null | undefined;
  joiningDate?: Date | null | undefined;
  qualification?: string | null | undefined;
  status?: TeacherStatus | undefined;
}

export class TeachersRepository {
  /**
   * Find a teacher by ID, excluding soft-deleted records by default.
   */
  async findById(id: string, includeDeleted = false): Promise<Teacher | null> {
    const conditions = [eq(teachers.id, id)];
    if (!includeDeleted) {
      conditions.push(isNull(teachers.deletedAt));
    }

    const rows = await db
      .select()
      .from(teachers)
      .where(and(...conditions))
      .limit(1);

    return rows[0] ?? null;
  }

  /**
   * Find a teacher by school ID and employee ID (case-insensitive).
   */
  async findBySchoolAndEmployeeId(
    schoolId: string,
    employeeId: string,
    includeDeleted = false,
  ): Promise<Teacher | null> {
    const conditions = [
      eq(teachers.schoolId, schoolId),
      eq(sql`lower(${teachers.employeeId})`, employeeId.trim().toLowerCase()),
    ];
    if (!includeDeleted) {
      conditions.push(isNull(teachers.deletedAt));
    }

    const rows = await db
      .select()
      .from(teachers)
      .where(and(...conditions))
      .limit(1);

    return rows[0] ?? null;
  }

  /**
   * Find a teacher by school ID and email (case-insensitive).
   */
  async findBySchoolAndEmail(
    schoolId: string,
    email: string,
    includeDeleted = false,
  ): Promise<Teacher | null> {
    const conditions = [
      eq(teachers.schoolId, schoolId),
      eq(sql`lower(${teachers.email})`, email.trim().toLowerCase()),
    ];
    if (!includeDeleted) {
      conditions.push(isNull(teachers.deletedAt));
    }

    const rows = await db
      .select()
      .from(teachers)
      .where(and(...conditions))
      .limit(1);

    return rows[0] ?? null;
  }

  /**
   * Find a teacher by user ID.
   */
  async findByUserId(userId: string, includeDeleted = false): Promise<Teacher | null> {
    const conditions = [eq(teachers.userId, userId)];
    if (!includeDeleted) {
      conditions.push(isNull(teachers.deletedAt));
    }

    const rows = await db
      .select()
      .from(teachers)
      .where(and(...conditions))
      .limit(1);

    return rows[0] ?? null;
  }

  /**
   * Create a new teacher record.
   */
  async create(data: CreateTeacherData): Promise<Teacher> {
    const rows = await db
      .insert(teachers)
      .values({
        schoolId: data.schoolId,
        employeeId: data.employeeId.trim(),
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        email: data.email.trim().toLowerCase(),
        phone: data.phone ?? null,
        userId: data.userId ?? null,
        joiningDate: data.joiningDate ?? null,
        qualification: data.qualification ?? null,
        status: data.status ?? 'active',
      })
      .returning();

    const created = rows[0];
    if (!created) {
      throw new Error('Failed to create teacher record');
    }

    return created;
  }

  /**
   * Update an existing teacher.
   */
  async update(id: string, data: UpdateTeacherData): Promise<Teacher | null> {
    const updateValues: Partial<typeof teachers.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (data.employeeId !== undefined) updateValues.employeeId = data.employeeId.trim();
    if (data.firstName !== undefined) updateValues.firstName = data.firstName.trim();
    if (data.lastName !== undefined) updateValues.lastName = data.lastName.trim();
    if (data.email !== undefined) updateValues.email = data.email.trim().toLowerCase();
    if (data.phone !== undefined) updateValues.phone = data.phone;
    if (data.userId !== undefined) updateValues.userId = data.userId;
    if (data.joiningDate !== undefined) updateValues.joiningDate = data.joiningDate;
    if (data.qualification !== undefined) updateValues.qualification = data.qualification;
    if (data.status !== undefined) updateValues.status = data.status;

    const rows = await db
      .update(teachers)
      .set(updateValues)
      .where(and(eq(teachers.id, id), isNull(teachers.deletedAt)))
      .returning();

    return rows[0] ?? null;
  }

  /**
   * Soft-delete a teacher by ID.
   */
  async softDelete(id: string): Promise<boolean> {
    const rows = await db
      .update(teachers)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(teachers.id, id), isNull(teachers.deletedAt)))
      .returning({ id: teachers.id });

    return rows.length > 0;
  }

  /**
   * List teachers under a school with keyset cursor pagination and optional filtering.
   */
  async listBySchool(
    schoolId: string,
    limit: number,
    cursor?: CursorPayload,
    filters?: TeacherFilters,
  ): Promise<Teacher[]> {
    const conditions = [eq(teachers.schoolId, schoolId), isNull(teachers.deletedAt)];

    if (filters?.status) {
      conditions.push(eq(teachers.status, filters.status));
    }

    if (filters?.search) {
      const searchPattern = `%${filters.search.trim()}%`;
      const searchCondition = or(
        ilike(teachers.firstName, searchPattern),
        ilike(teachers.lastName, searchPattern),
        ilike(teachers.email, searchPattern),
        ilike(teachers.employeeId, searchPattern),
      );
      if (searchCondition) {
        conditions.push(searchCondition);
      }
    }

    if (cursor) {
      const cursorCondition = or(
        lt(teachers.createdAt, cursor.createdAt),
        and(eq(teachers.createdAt, cursor.createdAt), lt(teachers.id, cursor.id)),
      );
      if (cursorCondition) {
        conditions.push(cursorCondition);
      }
    }

    return db
      .select()
      .from(teachers)
      .where(and(...conditions))
      .orderBy(desc(teachers.createdAt), desc(teachers.id))
      .limit(limit + 1);
  }
}

export const teachersRepository = new TeachersRepository();
