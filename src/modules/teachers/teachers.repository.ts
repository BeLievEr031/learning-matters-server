import { eq, isNull, and, or, lt, desc, asc, ilike, sql, inArray, count } from 'drizzle-orm';
import { db } from '../../db/pool.js';
import type { Transaction } from '../../db/transaction.js';
import { teachers, type Teacher, type TeacherStatus } from '../../db/schema/teachers.js';
import { boards } from '../../db/schema/boards.js';
import { grades } from '../../db/schema/grades.js';
import { subjects } from '../../db/schema/subjects.js';
import { chapters } from '../../db/schema/chapters.js';
import { teacherAssignments } from '../../db/schema/teacher-assignments.js';
import { chapterMaterials } from '../../db/schema/chapter-materials.js';
import { chapterNotes } from '../../db/schema/chapter-notes.js';
import type { CursorPayload } from '../../lib/pagination.js';
import type { TEACHER_SORT_FIELDS } from './teachers.schemas.js';

export interface TeacherFilters {
  status?: TeacherStatus | undefined;
  search?: string | undefined;
  sortBy?: (typeof TEACHER_SORT_FIELDS)[number] | undefined;
  sortOrder?: 'asc' | 'desc' | undefined;
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

export interface AssignedGradeResult {
  id: string;
  name: string;
  code: string;
  gradeNumber: number;
  section: string | null;
  boardId: string;
  boardName: string;
  isClassTeacher: boolean;
  totalAssignedSubjects: number;
}

export interface AssignedSubjectResult {
  id: string;
  name: string;
  code: string;
  description: string | null;
  assignmentId?: string | undefined;
  effectiveDate?: Date | null | undefined;
  status: string;
  totalChapters: number;
}

export interface AssignedChapterResult {
  id: string;
  chapterNumber: number;
  title: string;
  description: string | null;
  status: string;
  totalMaterials: number;
  totalNotes: number;
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
  async create(data: CreateTeacherData, tx?: Transaction): Promise<Teacher> {
    const executor = tx ?? db;
    const rows = await executor
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

    const sortField = filters?.sortBy ?? 'createdAt';
    const isAsc = filters?.sortOrder === 'asc';
    let primaryOrder = isAsc ? asc(teachers.createdAt) : desc(teachers.createdAt);

    if (sortField === 'firstName') {
      primaryOrder = isAsc ? asc(teachers.firstName) : desc(teachers.firstName);
    } else if (sortField === 'lastName') {
      primaryOrder = isAsc ? asc(teachers.lastName) : desc(teachers.lastName);
    } else if (sortField === 'email') {
      primaryOrder = isAsc ? asc(teachers.email) : desc(teachers.email);
    } else if (sortField === 'employeeId') {
      primaryOrder = isAsc ? asc(teachers.employeeId) : desc(teachers.employeeId);
    } else if (sortField === 'joiningDate') {
      primaryOrder = isAsc ? asc(teachers.joiningDate) : desc(teachers.joiningDate);
    } else if (sortField === 'status') {
      primaryOrder = isAsc ? asc(teachers.status) : desc(teachers.status);
    }

    return db
      .select()
      .from(teachers)
      .where(and(...conditions))
      .orderBy(primaryOrder, desc(teachers.id))
      .limit(limit + 1);
  }

  /**
   * Find distinct assigned grades for a teacher (including grades where teacher is class teacher).
   */
  async findAssignedGradesByTeacherId(
    teacherId: string,
    schoolId?: string,
  ): Promise<AssignedGradeResult[]> {
    const conditions = [isNull(grades.deletedAt)];
    if (schoolId) {
      conditions.push(eq(grades.schoolId, schoolId));
    }

    const assignedGradeIds = await db
      .select({ gradeId: teacherAssignments.gradeId })
      .from(teacherAssignments)
      .where(
        and(
          eq(teacherAssignments.teacherId, teacherId),
          eq(teacherAssignments.status, 'active'),
          isNull(teacherAssignments.deletedAt),
        ),
      );

    const gradeIdSet = new Set(assignedGradeIds.map((r) => r.gradeId));

    const classTeacherGrades = await db
      .select({ id: grades.id })
      .from(grades)
      .where(and(eq(grades.classTeacherId, teacherId), isNull(grades.deletedAt)));

    for (const g of classTeacherGrades) {
      gradeIdSet.add(g.id);
    }

    if (gradeIdSet.size === 0) {
      return [];
    }

    const allGradeRows = await db
      .select({
        id: grades.id,
        name: grades.name,
        code: grades.code,
        gradeNumber: grades.gradeNumber,
        section: grades.section,
        boardId: grades.boardId,
        boardName: boards.name,
        classTeacherId: grades.classTeacherId,
      })
      .from(grades)
      .innerJoin(boards, eq(grades.boardId, boards.id))
      .where(and(inArray(grades.id, Array.from(gradeIdSet)), ...conditions))
      .orderBy(asc(grades.gradeNumber), asc(grades.name));

    const subjectCounts = await db
      .select({
        gradeId: teacherAssignments.gradeId,
        count: count(teacherAssignments.subjectId),
      })
      .from(teacherAssignments)
      .where(
        and(
          eq(teacherAssignments.teacherId, teacherId),
          eq(teacherAssignments.status, 'active'),
          isNull(teacherAssignments.deletedAt),
        ),
      )
      .groupBy(teacherAssignments.gradeId);

    const subjectCountMap = new Map(subjectCounts.map((sc) => [sc.gradeId, sc.count]));

    return allGradeRows.map((g) => ({
      id: g.id,
      name: g.name,
      code: g.code,
      gradeNumber: g.gradeNumber,
      section: g.section,
      boardId: g.boardId,
      boardName: g.boardName,
      isClassTeacher: g.classTeacherId === teacherId,
      totalAssignedSubjects: subjectCountMap.get(g.id) ?? 0,
    }));
  }

  /**
   * Find subjects assigned to a teacher within a specific grade.
   */
  async findAssignedSubjectsByTeacherAndGrade(
    teacherId: string,
    gradeId: string,
  ): Promise<AssignedSubjectResult[]> {
    const rows = await db
      .select({
        id: subjects.id,
        name: subjects.name,
        code: subjects.code,
        description: subjects.description,
        assignmentId: teacherAssignments.id,
        effectiveDate: teacherAssignments.effectiveDate,
        status: teacherAssignments.status,
      })
      .from(teacherAssignments)
      .innerJoin(subjects, eq(teacherAssignments.subjectId, subjects.id))
      .where(
        and(
          eq(teacherAssignments.teacherId, teacherId),
          eq(teacherAssignments.gradeId, gradeId),
          eq(teacherAssignments.status, 'active'),
          isNull(teacherAssignments.deletedAt),
          isNull(subjects.deletedAt),
        ),
      )
      .orderBy(asc(subjects.name));

    if (rows.length === 0) {
      return [];
    }

    const subjectIds = rows.map((r) => r.id);
    const chapterCounts = await db
      .select({
        subjectId: chapters.subjectId,
        count: count(chapters.id),
      })
      .from(chapters)
      .where(
        and(
          inArray(chapters.subjectId, subjectIds),
          eq(chapters.status, 'active'),
          isNull(chapters.deletedAt),
        ),
      )
      .groupBy(chapters.subjectId);

    const chapterCountMap = new Map(chapterCounts.map((c) => [c.subjectId, c.count]));

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      code: r.code,
      description: r.description,
      assignmentId: r.assignmentId,
      effectiveDate: r.effectiveDate,
      status: r.status,
      totalChapters: chapterCountMap.get(r.id) ?? 0,
    }));
  }

  /**
   * Find all distinct subjects assigned to a teacher across all grades.
   */
  async findAllAssignedSubjectsByTeacher(teacherId: string): Promise<AssignedSubjectResult[]> {
    const rows = await db
      .select({
        id: subjects.id,
        name: subjects.name,
        code: subjects.code,
        description: subjects.description,
        status: subjects.status,
      })
      .from(teacherAssignments)
      .innerJoin(subjects, eq(teacherAssignments.subjectId, subjects.id))
      .where(
        and(
          eq(teacherAssignments.teacherId, teacherId),
          eq(teacherAssignments.status, 'active'),
          isNull(teacherAssignments.deletedAt),
          isNull(subjects.deletedAt),
        ),
      )
      .groupBy(subjects.id, subjects.name, subjects.code, subjects.description, subjects.status)
      .orderBy(asc(subjects.name));

    if (rows.length === 0) {
      return [];
    }

    const subjectIds = rows.map((r) => r.id);
    const chapterCounts = await db
      .select({
        subjectId: chapters.subjectId,
        count: count(chapters.id),
      })
      .from(chapters)
      .where(
        and(
          inArray(chapters.subjectId, subjectIds),
          eq(chapters.status, 'active'),
          isNull(chapters.deletedAt),
        ),
      )
      .groupBy(chapters.subjectId);

    const chapterCountMap = new Map(chapterCounts.map((c) => [c.subjectId, c.count]));

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      code: r.code,
      description: r.description,
      status: r.status,
      totalChapters: chapterCountMap.get(r.id) ?? 0,
    }));
  }

  /**
   * Find active chapters for a subject with counts of materials and notes.
   */
  async findChaptersBySubject(subjectId: string): Promise<AssignedChapterResult[]> {
    const chapterRows = await db
      .select({
        id: chapters.id,
        chapterNumber: chapters.chapterNumber,
        title: chapters.title,
        description: chapters.description,
        status: chapters.status,
      })
      .from(chapters)
      .where(
        and(
          eq(chapters.subjectId, subjectId),
          eq(chapters.status, 'active'),
          isNull(chapters.deletedAt),
        ),
      )
      .orderBy(asc(chapters.chapterNumber));

    if (chapterRows.length === 0) {
      return [];
    }

    const chapterIds = chapterRows.map((c) => c.id);

    const materialsCounts = await db
      .select({
        chapterId: chapterMaterials.chapterId,
        count: count(chapterMaterials.id),
      })
      .from(chapterMaterials)
      .where(
        and(inArray(chapterMaterials.chapterId, chapterIds), isNull(chapterMaterials.deletedAt)),
      )
      .groupBy(chapterMaterials.chapterId);

    const notesCounts = await db
      .select({
        chapterId: chapterNotes.chapterId,
        count: count(chapterNotes.id),
      })
      .from(chapterNotes)
      .where(and(inArray(chapterNotes.chapterId, chapterIds), isNull(chapterNotes.deletedAt)))
      .groupBy(chapterNotes.chapterId);

    const matMap = new Map(materialsCounts.map((m) => [m.chapterId, m.count]));
    const notesMap = new Map(notesCounts.map((n) => [n.chapterId, n.count]));

    return chapterRows.map((c) => ({
      id: c.id,
      chapterNumber: c.chapterNumber,
      title: c.title,
      description: c.description,
      status: c.status,
      totalMaterials: matMap.get(c.id) ?? 0,
      totalNotes: notesMap.get(c.id) ?? 0,
    }));
  }

  /**
   * Check if teacher has an active assignment for a subject.
   */
  async hasTeacherSubjectAssignment(teacherId: string, subjectId: string): Promise<boolean> {
    const rows = await db
      .select({ id: teacherAssignments.id })
      .from(teacherAssignments)
      .where(
        and(
          eq(teacherAssignments.teacherId, teacherId),
          eq(teacherAssignments.subjectId, subjectId),
          eq(teacherAssignments.status, 'active'),
          isNull(teacherAssignments.deletedAt),
        ),
      )
      .limit(1);

    return rows.length > 0;
  }

  /**
   * Check if teacher has an active assignment for a grade.
   */
  async hasTeacherGradeAssignment(teacherId: string, gradeId: string): Promise<boolean> {
    const rows = await db
      .select({ id: teacherAssignments.id })
      .from(teacherAssignments)
      .where(
        and(
          eq(teacherAssignments.teacherId, teacherId),
          eq(teacherAssignments.gradeId, gradeId),
          eq(teacherAssignments.status, 'active'),
          isNull(teacherAssignments.deletedAt),
        ),
      )
      .limit(1);

    return rows.length > 0;
  }
}

export const teachersRepository = new TeachersRepository();
