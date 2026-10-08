import { eq, isNull, and, or, lt, desc, ilike, sql } from 'drizzle-orm';
import { db } from '../../db/pool.js';
import {
  students,
  type Student,
  type StudentStatus,
  type StudentGender,
} from '../../db/schema/students.js';
import type { CursorPayload } from '../../lib/pagination.js';

export interface StudentFilters {
  status?: StudentStatus | undefined;
  gender?: StudentGender | undefined;
  search?: string | undefined;
}

export interface CreateStudentData {
  schoolId: string;
  boardId: string;
  gradeId: string;
  userId?: string | null | undefined;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: Date | null | undefined;
  gender?: StudentGender | null | undefined;
  email?: string | null | undefined;
  phone?: string | null | undefined;
  guardianName?: string | null | undefined;
  guardianPhone?: string | null | undefined;
  guardianEmail?: string | null | undefined;
  address?: string | null | undefined;
  status?: StudentStatus | undefined;
}

export interface UpdateStudentData {
  admissionNumber?: string | undefined;
  firstName?: string | undefined;
  lastName?: string | undefined;
  dateOfBirth?: Date | null | undefined;
  gender?: StudentGender | null | undefined;
  email?: string | null | undefined;
  phone?: string | null | undefined;
  guardianName?: string | null | undefined;
  guardianPhone?: string | null | undefined;
  guardianEmail?: string | null | undefined;
  address?: string | null | undefined;
  userId?: string | null | undefined;
  status?: StudentStatus | undefined;
}

export class StudentsRepository {
  /**
   * Find a student by ID, excluding soft-deleted records by default.
   */
  async findById(id: string, includeDeleted = false): Promise<Student | null> {
    const conditions = [eq(students.id, id)];
    if (!includeDeleted) {
      conditions.push(isNull(students.deletedAt));
    }

    const rows = await db
      .select()
      .from(students)
      .where(and(...conditions))
      .limit(1);

    return rows[0] ?? null;
  }

  /**
   * Find a student by school ID and admission number (case-insensitive).
   */
  async findBySchoolAndAdmissionNumber(
    schoolId: string,
    admissionNumber: string,
    includeDeleted = false,
  ): Promise<Student | null> {
    const conditions = [
      eq(students.schoolId, schoolId),
      eq(sql`lower(${students.admissionNumber})`, admissionNumber.trim().toLowerCase()),
    ];
    if (!includeDeleted) {
      conditions.push(isNull(students.deletedAt));
    }

    const rows = await db
      .select()
      .from(students)
      .where(and(...conditions))
      .limit(1);

    return rows[0] ?? null;
  }

  /**
   * Create a new student record.
   */
  async create(data: CreateStudentData): Promise<Student> {
    const rows = await db
      .insert(students)
      .values({
        schoolId: data.schoolId,
        boardId: data.boardId,
        gradeId: data.gradeId,
        userId: data.userId ?? null,
        admissionNumber: data.admissionNumber.trim(),
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        dateOfBirth: data.dateOfBirth ?? null,
        gender: data.gender ?? null,
        email: data.email ? data.email.trim().toLowerCase() : null,
        phone: data.phone ?? null,
        guardianName: data.guardianName ?? null,
        guardianPhone: data.guardianPhone ?? null,
        guardianEmail: data.guardianEmail ? data.guardianEmail.trim().toLowerCase() : null,
        address: data.address ?? null,
        status: data.status ?? 'active',
      })
      .returning();

    const created = rows[0];
    if (!created) {
      throw new Error('Failed to create student record');
    }

    return created;
  }

  /**
   * Update an existing student.
   */
  async update(id: string, data: UpdateStudentData): Promise<Student | null> {
    const updateValues: Partial<typeof students.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (data.admissionNumber !== undefined)
      updateValues.admissionNumber = data.admissionNumber.trim();
    if (data.firstName !== undefined) updateValues.firstName = data.firstName.trim();
    if (data.lastName !== undefined) updateValues.lastName = data.lastName.trim();
    if (data.dateOfBirth !== undefined) updateValues.dateOfBirth = data.dateOfBirth;
    if (data.gender !== undefined) updateValues.gender = data.gender;
    if (data.email !== undefined)
      updateValues.email = data.email ? data.email.trim().toLowerCase() : null;
    if (data.phone !== undefined) updateValues.phone = data.phone;
    if (data.guardianName !== undefined) updateValues.guardianName = data.guardianName;
    if (data.guardianPhone !== undefined) updateValues.guardianPhone = data.guardianPhone;
    if (data.guardianEmail !== undefined) {
      updateValues.guardianEmail = data.guardianEmail
        ? data.guardianEmail.trim().toLowerCase()
        : null;
    }
    if (data.address !== undefined) updateValues.address = data.address;
    if (data.userId !== undefined) updateValues.userId = data.userId;
    if (data.status !== undefined) updateValues.status = data.status;

    const rows = await db
      .update(students)
      .set(updateValues)
      .where(and(eq(students.id, id), isNull(students.deletedAt)))
      .returning();

    return rows[0] ?? null;
  }

  /**
   * Transfer a student to another grade (and board).
   */
  async transfer(
    id: string,
    targetGradeId: string,
    targetBoardId: string,
  ): Promise<Student | null> {
    const rows = await db
      .update(students)
      .set({
        gradeId: targetGradeId,
        boardId: targetBoardId,
        updatedAt: new Date(),
      })
      .where(and(eq(students.id, id), isNull(students.deletedAt)))
      .returning();

    return rows[0] ?? null;
  }

  /**
   * Soft-delete a student by ID.
   */
  async softDelete(id: string): Promise<boolean> {
    const rows = await db
      .update(students)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(students.id, id), isNull(students.deletedAt)))
      .returning({ id: students.id });

    return rows.length > 0;
  }

  /**
   * List students in a grade with keyset cursor pagination and optional filtering.
   */
  async listByGrade(
    gradeId: string,
    limit: number,
    cursor?: CursorPayload,
    filters?: StudentFilters,
  ): Promise<Student[]> {
    const conditions = [eq(students.gradeId, gradeId), isNull(students.deletedAt)];

    if (filters?.status) {
      conditions.push(eq(students.status, filters.status));
    }

    if (filters?.gender) {
      conditions.push(eq(students.gender, filters.gender));
    }

    if (filters?.search) {
      const searchPattern = `%${filters.search.trim()}%`;
      const searchCondition = or(
        ilike(students.firstName, searchPattern),
        ilike(students.lastName, searchPattern),
        ilike(students.admissionNumber, searchPattern),
        ilike(students.email, searchPattern),
      );
      if (searchCondition) {
        conditions.push(searchCondition);
      }
    }

    if (cursor) {
      const cursorCondition = or(
        lt(students.createdAt, cursor.createdAt),
        and(eq(students.createdAt, cursor.createdAt), lt(students.id, cursor.id)),
      );
      if (cursorCondition) {
        conditions.push(cursorCondition);
      }
    }

    return db
      .select()
      .from(students)
      .where(and(...conditions))
      .orderBy(desc(students.createdAt), desc(students.id))
      .limit(limit + 1);
  }
}

export const studentsRepository = new StudentsRepository();
