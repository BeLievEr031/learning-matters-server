import { eq, isNull, and, or, lt, desc, asc, ilike } from 'drizzle-orm';
import { db } from '../../db/pool.js';
import {
  subjects,
  gradeSubjects,
  type Subject,
  type SubjectStatus,
  type GradeSubject,
  type GradeSubjectStatus,
} from '../../db/schema/subjects.js';
import type { CursorPayload } from '../../lib/pagination.js';
import type { SUBJECT_SORT_FIELDS } from './subjects.schemas.js';

export interface SubjectFilters {
  status?: SubjectStatus | undefined;
  search?: string | undefined;
  sortBy?: (typeof SUBJECT_SORT_FIELDS)[number] | undefined;
  sortOrder?: 'asc' | 'desc' | undefined;
}

export interface CreateSubjectData {
  schoolId: string;
  name: string;
  code: string;
  description?: string | null | undefined;
  status?: SubjectStatus | undefined;
}

export interface UpdateSubjectData {
  name?: string | undefined;
  code?: string | undefined;
  description?: string | null | undefined;
  status?: SubjectStatus | undefined;
}

export interface GradeSubjectItem extends Subject {
  gradeSubjectId: string;
  gradeSubjectStatus: GradeSubjectStatus;
}

export class SubjectsRepository {
  /**
   * Find a master subject by ID, excluding soft-deleted records by default.
   */
  async findById(id: string, includeDeleted = false): Promise<Subject | null> {
    const conditions = [eq(subjects.id, id)];
    if (!includeDeleted) {
      conditions.push(isNull(subjects.deletedAt));
    }

    const rows = await db
      .select()
      .from(subjects)
      .where(and(...conditions))
      .limit(1);

    return rows[0] ?? null;
  }

  /**
   * Find a master subject by school ID and code (case-insensitive).
   */
  async findBySchoolAndCode(
    schoolId: string,
    code: string,
    includeDeleted = false,
  ): Promise<Subject | null> {
    const conditions = [eq(subjects.schoolId, schoolId), ilike(subjects.code, code.trim())];
    if (!includeDeleted) {
      conditions.push(isNull(subjects.deletedAt));
    }

    const rows = await db
      .select()
      .from(subjects)
      .where(and(...conditions))
      .limit(1);

    return rows[0] ?? null;
  }

  /**
   * Create a new subject in the school catalog.
   */
  async create(data: CreateSubjectData): Promise<Subject> {
    const rows = await db
      .insert(subjects)
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
      throw new Error('Failed to create subject record');
    }
    return created;
  }

  /**
   * Update an existing master subject.
   */
  async update(id: string, data: UpdateSubjectData): Promise<Subject | null> {
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
      .update(subjects)
      .set(updateValues)
      .where(and(eq(subjects.id, id), isNull(subjects.deletedAt)))
      .returning();

    return rows[0] ?? null;
  }

  /**
   * Soft-delete a master subject by setting deletedAt timestamp.
   */
  async softDelete(id: string): Promise<boolean> {
    const rows = await db
      .update(subjects)
      .set({ deletedAt: new Date() })
      .where(and(eq(subjects.id, id), isNull(subjects.deletedAt)))
      .returning({ id: subjects.id });

    return rows.length > 0;
  }

  /**
   * Find grade-subject join record by gradeId and subjectId.
   */
  async findGradeSubject(gradeId: string, subjectId: string): Promise<GradeSubject | null> {
    const rows = await db
      .select()
      .from(gradeSubjects)
      .where(and(eq(gradeSubjects.gradeId, gradeId), eq(gradeSubjects.subjectId, subjectId)))
      .limit(1);

    return rows[0] ?? null;
  }

  /**
   * Assign a subject to a grade in grade_subjects.
   */
  async assignToGrade(
    schoolId: string,
    gradeId: string,
    subjectId: string,
    status: GradeSubjectStatus = 'active',
  ): Promise<GradeSubject> {
    const rows = await db
      .insert(gradeSubjects)
      .values({
        schoolId,
        gradeId,
        subjectId,
        status,
      })
      .returning();

    const created = rows[0];
    if (!created) {
      throw new Error('Failed to assign subject to grade');
    }
    return created;
  }

  /**
   * Remove a grade-subject association.
   */
  async removeGradeAssignment(gradeId: string, subjectId: string): Promise<boolean> {
    const rows = await db
      .delete(gradeSubjects)
      .where(and(eq(gradeSubjects.gradeId, gradeId), eq(gradeSubjects.subjectId, subjectId)))
      .returning({ id: gradeSubjects.id });

    return rows.length > 0;
  }

  /**
   * Cascade remove all grade associations when a subject is deleted.
   */
  async cascadeRemoveGradeAssignments(subjectId: string): Promise<number> {
    const rows = await db
      .delete(gradeSubjects)
      .where(eq(gradeSubjects.subjectId, subjectId))
      .returning({ id: gradeSubjects.id });

    return rows.length;
  }

  /**
   * List subjects associated with a specific grade with pagination and filters.
   */
  async listSubjectsByGrade(
    gradeId: string,
    limit: number,
    cursor?: CursorPayload,
    filters?: SubjectFilters,
  ): Promise<GradeSubjectItem[]> {
    const conditions = [eq(gradeSubjects.gradeId, gradeId), isNull(subjects.deletedAt)];

    if (filters?.status) {
      conditions.push(eq(subjects.status, filters.status));
    }

    if (filters?.search && filters.search.trim().length > 0) {
      const pattern = `%${filters.search.trim()}%`;
      const searchCondition = or(ilike(subjects.name, pattern), ilike(subjects.code, pattern));
      if (searchCondition) {
        conditions.push(searchCondition);
      }
    }

    if (cursor) {
      const cursorCondition = or(
        lt(gradeSubjects.createdAt, cursor.createdAt),
        and(eq(gradeSubjects.createdAt, cursor.createdAt), lt(gradeSubjects.id, cursor.id)),
      );
      if (cursorCondition) {
        conditions.push(cursorCondition);
      }
    }

    let primaryOrder = desc(gradeSubjects.createdAt);
    if (filters?.sortBy === 'name') {
      primaryOrder = filters.sortOrder === 'asc' ? asc(subjects.name) : desc(subjects.name);
    } else if (filters?.sortBy === 'code') {
      primaryOrder = filters.sortOrder === 'asc' ? asc(subjects.code) : desc(subjects.code);
    } else if (filters?.sortBy === 'status') {
      primaryOrder = filters.sortOrder === 'asc' ? asc(subjects.status) : desc(subjects.status);
    } else if (filters?.sortBy === 'createdAt') {
      primaryOrder =
        filters.sortOrder === 'asc' ? asc(gradeSubjects.createdAt) : desc(gradeSubjects.createdAt);
    }

    const rows = await db
      .select({
        id: subjects.id,
        schoolId: subjects.schoolId,
        name: subjects.name,
        code: subjects.code,
        description: subjects.description,
        status: subjects.status,
        createdAt: subjects.createdAt,
        updatedAt: subjects.updatedAt,
        deletedAt: subjects.deletedAt,
        gradeSubjectId: gradeSubjects.id,
        gradeSubjectStatus: gradeSubjects.status,
      })
      .from(gradeSubjects)
      .innerJoin(subjects, eq(gradeSubjects.subjectId, subjects.id))
      .where(and(...conditions))
      .orderBy(primaryOrder, desc(gradeSubjects.id))
      .limit(limit + 1);

    return rows;
  }

  /**
   * Check if any active grade assignments exist for a subject.
   */
  async hasActiveGradeSubjects(subjectId: string): Promise<boolean> {
    const rows = await db
      .select({ id: gradeSubjects.id })
      .from(gradeSubjects)
      .where(and(eq(gradeSubjects.subjectId, subjectId), eq(gradeSubjects.status, 'active')))
      .limit(1);

    return rows.length > 0;
  }
}

export const subjectsRepository = new SubjectsRepository();
