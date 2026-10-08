import { eq, isNull, and, or, lt, desc, type SQL } from 'drizzle-orm';
import { db } from '../../db/pool.js';
import {
  teacherAssignments,
  type TeacherAssignment,
  type TeacherAssignmentStatus,
} from '../../db/schema/teacher-assignments.js';
import { teachers } from '../../db/schema/teachers.js';
import { grades } from '../../db/schema/grades.js';
import { subjects } from '../../db/schema/subjects.js';
import type { CursorPayload } from '../../lib/pagination.js';

export interface TeacherAssignmentFilters {
  schoolId?: string | undefined;
  teacherId?: string | undefined;
  gradeId?: string | undefined;
  subjectId?: string | undefined;
  status?: TeacherAssignmentStatus | undefined;
}

export interface CreateTeacherAssignmentData {
  schoolId: string;
  teacherId: string;
  gradeId: string;
  subjectId: string;
  assignedBy?: string | null | undefined;
  status?: TeacherAssignmentStatus | undefined;
  effectiveDate?: Date | null | undefined;
}

export interface UpdateTeacherAssignmentData {
  status?: TeacherAssignmentStatus | undefined;
  effectiveDate?: Date | null | undefined;
}

export interface TeacherAssignmentDetail extends TeacherAssignment {
  teacherFirstName?: string | null | undefined;
  teacherLastName?: string | null | undefined;
  teacherEmail?: string | null | undefined;
  teacherEmployeeId?: string | null | undefined;
  gradeName?: string | null | undefined;
  gradeCode?: string | null | undefined;
  subjectName?: string | null | undefined;
  subjectCode?: string | null | undefined;
}

export class TeacherAssignmentsRepository {
  /**
   * Find an assignment by ID, excluding soft-deleted records by default.
   */
  async findById(id: string, includeDeleted = false): Promise<TeacherAssignmentDetail | null> {
    const conditions = [eq(teacherAssignments.id, id)];
    if (!includeDeleted) {
      conditions.push(isNull(teacherAssignments.deletedAt));
    }

    const rows = await db
      .select({
        id: teacherAssignments.id,
        schoolId: teacherAssignments.schoolId,
        teacherId: teacherAssignments.teacherId,
        gradeId: teacherAssignments.gradeId,
        subjectId: teacherAssignments.subjectId,
        assignedBy: teacherAssignments.assignedBy,
        status: teacherAssignments.status,
        effectiveDate: teacherAssignments.effectiveDate,
        createdAt: teacherAssignments.createdAt,
        updatedAt: teacherAssignments.updatedAt,
        deletedAt: teacherAssignments.deletedAt,
        teacherFirstName: teachers.firstName,
        teacherLastName: teachers.lastName,
        teacherEmail: teachers.email,
        teacherEmployeeId: teachers.employeeId,
        gradeName: grades.name,
        gradeCode: grades.code,
        subjectName: subjects.name,
        subjectCode: subjects.code,
      })
      .from(teacherAssignments)
      .leftJoin(teachers, eq(teacherAssignments.teacherId, teachers.id))
      .leftJoin(grades, eq(teacherAssignments.gradeId, grades.id))
      .leftJoin(subjects, eq(teacherAssignments.subjectId, subjects.id))
      .where(and(...conditions))
      .limit(1);

    return rows[0] ?? null;
  }

  /**
   * Find an existing assignment by (teacherId, gradeId, subjectId).
   */
  async findByTeacherGradeSubject(
    teacherId: string,
    gradeId: string,
    subjectId: string,
    includeDeleted = false,
  ): Promise<TeacherAssignment | null> {
    const conditions = [
      eq(teacherAssignments.teacherId, teacherId),
      eq(teacherAssignments.gradeId, gradeId),
      eq(teacherAssignments.subjectId, subjectId),
    ];
    if (!includeDeleted) {
      conditions.push(isNull(teacherAssignments.deletedAt));
    }

    const rows = await db
      .select()
      .from(teacherAssignments)
      .where(and(...conditions))
      .limit(1);

    return rows[0] ?? null;
  }

  /**
   * Create a new teacher assignment record.
   */
  async create(data: CreateTeacherAssignmentData): Promise<TeacherAssignment> {
    const rows = await db
      .insert(teacherAssignments)
      .values({
        schoolId: data.schoolId,
        teacherId: data.teacherId,
        gradeId: data.gradeId,
        subjectId: data.subjectId,
        assignedBy: data.assignedBy ?? null,
        status: data.status ?? 'active',
        effectiveDate: data.effectiveDate ?? null,
      })
      .returning();

    const created = rows[0];
    if (!created) {
      throw new Error('Failed to create teacher assignment record');
    }

    return created;
  }

  /**
   * Update an existing teacher assignment.
   */
  async update(id: string, data: UpdateTeacherAssignmentData): Promise<TeacherAssignment | null> {
    const updateValues: Partial<typeof teacherAssignments.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (data.status !== undefined) updateValues.status = data.status;
    if (data.effectiveDate !== undefined) updateValues.effectiveDate = data.effectiveDate;

    const rows = await db
      .update(teacherAssignments)
      .set(updateValues)
      .where(and(eq(teacherAssignments.id, id), isNull(teacherAssignments.deletedAt)))
      .returning();

    return rows[0] ?? null;
  }

  /**
   * Soft-delete an assignment by ID.
   */
  async softDelete(id: string): Promise<boolean> {
    const rows = await db
      .update(teacherAssignments)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(teacherAssignments.id, id), isNull(teacherAssignments.deletedAt)))
      .returning({ id: teacherAssignments.id });

    return rows.length > 0;
  }

  /**
   * List assignments with keyset cursor pagination and optional filtering.
   */
  async list(
    limit: number,
    cursor?: CursorPayload,
    filters?: TeacherAssignmentFilters,
  ): Promise<TeacherAssignmentDetail[]> {
    const conditions: SQL[] = [isNull(teacherAssignments.deletedAt)];

    if (filters?.schoolId) {
      conditions.push(eq(teacherAssignments.schoolId, filters.schoolId));
    }

    if (filters?.teacherId) {
      conditions.push(eq(teacherAssignments.teacherId, filters.teacherId));
    }

    if (filters?.gradeId) {
      conditions.push(eq(teacherAssignments.gradeId, filters.gradeId));
    }

    if (filters?.subjectId) {
      conditions.push(eq(teacherAssignments.subjectId, filters.subjectId));
    }

    if (filters?.status) {
      conditions.push(eq(teacherAssignments.status, filters.status));
    }

    if (cursor) {
      const cursorCondition = or(
        lt(teacherAssignments.createdAt, cursor.createdAt),
        and(
          eq(teacherAssignments.createdAt, cursor.createdAt),
          lt(teacherAssignments.id, cursor.id),
        ),
      );
      if (cursorCondition) {
        conditions.push(cursorCondition);
      }
    }

    return db
      .select({
        id: teacherAssignments.id,
        schoolId: teacherAssignments.schoolId,
        teacherId: teacherAssignments.teacherId,
        gradeId: teacherAssignments.gradeId,
        subjectId: teacherAssignments.subjectId,
        assignedBy: teacherAssignments.assignedBy,
        status: teacherAssignments.status,
        effectiveDate: teacherAssignments.effectiveDate,
        createdAt: teacherAssignments.createdAt,
        updatedAt: teacherAssignments.updatedAt,
        deletedAt: teacherAssignments.deletedAt,
        teacherFirstName: teachers.firstName,
        teacherLastName: teachers.lastName,
        teacherEmail: teachers.email,
        teacherEmployeeId: teachers.employeeId,
        gradeName: grades.name,
        gradeCode: grades.code,
        subjectName: subjects.name,
        subjectCode: subjects.code,
      })
      .from(teacherAssignments)
      .leftJoin(teachers, eq(teacherAssignments.teacherId, teachers.id))
      .leftJoin(grades, eq(teacherAssignments.gradeId, grades.id))
      .leftJoin(subjects, eq(teacherAssignments.subjectId, subjects.id))
      .where(and(...conditions))
      .orderBy(desc(teacherAssignments.createdAt), desc(teacherAssignments.id))
      .limit(limit + 1);
  }

  /**
   * List all assignments for a specific teacher.
   */
  async listByTeacher(
    teacherId: string,
    status?: TeacherAssignmentStatus,
  ): Promise<TeacherAssignmentDetail[]> {
    const conditions: SQL[] = [
      eq(teacherAssignments.teacherId, teacherId),
      isNull(teacherAssignments.deletedAt),
    ];
    if (status) {
      conditions.push(eq(teacherAssignments.status, status));
    }

    return db
      .select({
        id: teacherAssignments.id,
        schoolId: teacherAssignments.schoolId,
        teacherId: teacherAssignments.teacherId,
        gradeId: teacherAssignments.gradeId,
        subjectId: teacherAssignments.subjectId,
        assignedBy: teacherAssignments.assignedBy,
        status: teacherAssignments.status,
        effectiveDate: teacherAssignments.effectiveDate,
        createdAt: teacherAssignments.createdAt,
        updatedAt: teacherAssignments.updatedAt,
        deletedAt: teacherAssignments.deletedAt,
        teacherFirstName: teachers.firstName,
        teacherLastName: teachers.lastName,
        teacherEmail: teachers.email,
        teacherEmployeeId: teachers.employeeId,
        gradeName: grades.name,
        gradeCode: grades.code,
        subjectName: subjects.name,
        subjectCode: subjects.code,
      })
      .from(teacherAssignments)
      .leftJoin(teachers, eq(teacherAssignments.teacherId, teachers.id))
      .leftJoin(grades, eq(teacherAssignments.gradeId, grades.id))
      .leftJoin(subjects, eq(teacherAssignments.subjectId, subjects.id))
      .where(and(...conditions))
      .orderBy(desc(teacherAssignments.createdAt));
  }

  /**
   * List all assignments for a specific grade.
   */
  async listByGrade(
    gradeId: string,
    status?: TeacherAssignmentStatus,
  ): Promise<TeacherAssignmentDetail[]> {
    const conditions: SQL[] = [
      eq(teacherAssignments.gradeId, gradeId),
      isNull(teacherAssignments.deletedAt),
    ];
    if (status) {
      conditions.push(eq(teacherAssignments.status, status));
    }

    return db
      .select({
        id: teacherAssignments.id,
        schoolId: teacherAssignments.schoolId,
        teacherId: teacherAssignments.teacherId,
        gradeId: teacherAssignments.gradeId,
        subjectId: teacherAssignments.subjectId,
        assignedBy: teacherAssignments.assignedBy,
        status: teacherAssignments.status,
        effectiveDate: teacherAssignments.effectiveDate,
        createdAt: teacherAssignments.createdAt,
        updatedAt: teacherAssignments.updatedAt,
        deletedAt: teacherAssignments.deletedAt,
        teacherFirstName: teachers.firstName,
        teacherLastName: teachers.lastName,
        teacherEmail: teachers.email,
        teacherEmployeeId: teachers.employeeId,
        gradeName: grades.name,
        gradeCode: grades.code,
        subjectName: subjects.name,
        subjectCode: subjects.code,
      })
      .from(teacherAssignments)
      .leftJoin(teachers, eq(teacherAssignments.teacherId, teachers.id))
      .leftJoin(grades, eq(teacherAssignments.gradeId, grades.id))
      .leftJoin(subjects, eq(teacherAssignments.subjectId, subjects.id))
      .where(and(...conditions))
      .orderBy(desc(teacherAssignments.createdAt));
  }

  /**
   * List all assignments for a specific subject.
   */
  async listBySubject(
    subjectId: string,
    status?: TeacherAssignmentStatus,
  ): Promise<TeacherAssignmentDetail[]> {
    const conditions: SQL[] = [
      eq(teacherAssignments.subjectId, subjectId),
      isNull(teacherAssignments.deletedAt),
    ];
    if (status) {
      conditions.push(eq(teacherAssignments.status, status));
    }

    return db
      .select({
        id: teacherAssignments.id,
        schoolId: teacherAssignments.schoolId,
        teacherId: teacherAssignments.teacherId,
        gradeId: teacherAssignments.gradeId,
        subjectId: teacherAssignments.subjectId,
        assignedBy: teacherAssignments.assignedBy,
        status: teacherAssignments.status,
        effectiveDate: teacherAssignments.effectiveDate,
        createdAt: teacherAssignments.createdAt,
        updatedAt: teacherAssignments.updatedAt,
        deletedAt: teacherAssignments.deletedAt,
        teacherFirstName: teachers.firstName,
        teacherLastName: teachers.lastName,
        teacherEmail: teachers.email,
        teacherEmployeeId: teachers.employeeId,
        gradeName: grades.name,
        gradeCode: grades.code,
        subjectName: subjects.name,
        subjectCode: subjects.code,
      })
      .from(teacherAssignments)
      .leftJoin(teachers, eq(teacherAssignments.teacherId, teachers.id))
      .leftJoin(grades, eq(teacherAssignments.gradeId, grades.id))
      .leftJoin(subjects, eq(teacherAssignments.subjectId, subjects.id))
      .where(and(...conditions))
      .orderBy(desc(teacherAssignments.createdAt));
  }
}

export const teacherAssignmentsRepository = new TeacherAssignmentsRepository();
