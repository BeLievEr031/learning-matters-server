import {
  subjectsRepository,
  type SubjectsRepository,
  type GradeSubjectItem,
} from './subjects.repository.js';
import { gradesRepository, type GradesRepository } from '../grades/grades.repository.js';
import type { Subject } from '../../db/schema/subjects.js';
import type {
  AssignOrCreateSubjectInput,
  UpdateSubjectInput,
  ListSubjectsQuery,
} from './subjects.schemas.js';
import type { UserRole } from '../../db/schema/users.js';
import {
  NotFoundError,
  ConflictError,
  ForbiddenError,
  BadRequestError,
} from '../../lib/app-error.js';
import {
  decodeCursor,
  buildPaginatedResponse,
  type PaginatedResult,
} from '../../lib/pagination.js';

export class SubjectsService {
  constructor(
    private readonly repo: SubjectsRepository = subjectsRepository,
    private readonly gradesRepo: GradesRepository = gradesRepository,
  ) {}

  /**
   * Verify grade exists and that non-super_admin users can only access their school's grade.
   */
  private async getAndVerifyGradeAccess(
    gradeId: string,
    callerSchoolId?: string | null,
    callerRole?: UserRole,
  ) {
    const grade = await this.gradesRepo.findById(gradeId);
    if (!grade) {
      throw new NotFoundError('Grade not found');
    }

    if (callerRole && callerRole !== 'super_admin') {
      if (!callerSchoolId || grade.schoolId !== callerSchoolId) {
        throw new ForbiddenError('Forbidden: Access to this grade is not allowed');
      }
    }

    return grade;
  }

  /**
   * Verify subject exists and that non-super_admin users can only access their school's subject.
   */
  private async getAndVerifySubjectAccess(
    subjectId: string,
    callerSchoolId?: string | null,
    callerRole?: UserRole,
  ): Promise<Subject> {
    const subject = await this.repo.findById(subjectId);
    if (!subject) {
      throw new NotFoundError('Subject not found');
    }

    if (callerRole && callerRole !== 'super_admin') {
      if (!callerSchoolId || subject.schoolId !== callerSchoolId) {
        throw new ForbiddenError('Forbidden: Access to this subject is not allowed');
      }
    }

    return subject;
  }

  /**
   * Assign subject to grade. Reuses existing master subject if found by code or creates new if needed.
   */
  async assignOrCreateSubject(
    gradeId: string,
    input: AssignOrCreateSubjectInput,
    callerSchoolId?: string | null,
    callerRole?: UserRole,
  ): Promise<GradeSubjectItem> {
    const grade = await this.getAndVerifyGradeAccess(gradeId, callerSchoolId, callerRole);

    let subject: Subject;

    if (input.subjectId) {
      subject = await this.getAndVerifySubjectAccess(input.subjectId, callerSchoolId, callerRole);
      if (subject.schoolId !== grade.schoolId) {
        throw new ForbiddenError('Forbidden: Subject belongs to a different school');
      }
    } else {
      if (!input.name || !input.code) {
        throw new BadRequestError(
          'Subject name and code are required when subjectId is not provided',
        );
      }
      const normalizedCode = input.code.trim().toUpperCase();
      const existing = await this.repo.findBySchoolAndCode(grade.schoolId, normalizedCode);

      if (existing) {
        subject = existing;
      } else {
        subject = await this.repo.create({
          schoolId: grade.schoolId,
          name: input.name.trim(),
          code: normalizedCode,
          description: input.description,
          status: input.status,
        });
      }
    }

    // Check if already assigned to this grade
    const existingAssignment = await this.repo.findGradeSubject(gradeId, subject.id);
    if (existingAssignment) {
      throw new ConflictError('Subject is already assigned to this grade');
    }

    const assignment = await this.repo.assignToGrade(grade.schoolId, gradeId, subject.id, 'active');

    return {
      ...subject,
      gradeSubjectId: assignment.id,
      gradeSubjectStatus: assignment.status,
    };
  }

  /**
   * Retrieve a subject by ID with school-scoped access check.
   */
  async getSubjectById(
    subjectId: string,
    callerSchoolId?: string | null,
    callerRole?: UserRole,
  ): Promise<Subject> {
    return this.getAndVerifySubjectAccess(subjectId, callerSchoolId, callerRole);
  }

  /**
   * Update an existing master subject.
   */
  async updateSubject(
    subjectId: string,
    input: UpdateSubjectInput,
    callerSchoolId?: string | null,
    callerRole?: UserRole,
  ): Promise<Subject> {
    const subject = await this.getAndVerifySubjectAccess(subjectId, callerSchoolId, callerRole);

    if (input.code) {
      const normalizedCode = input.code.trim().toUpperCase();
      if (normalizedCode !== subject.code.toUpperCase()) {
        const conflict = await this.repo.findBySchoolAndCode(subject.schoolId, normalizedCode);
        if (conflict && conflict.id !== subjectId) {
          throw new ConflictError('Subject with this code already exists for this school');
        }
      }
    }

    const updated = await this.repo.update(subjectId, input);
    if (!updated) {
      throw new NotFoundError('Subject not found');
    }

    return updated;
  }

  /**
   * Remove a subject assignment from a grade.
   */
  async removeGradeAssignment(
    gradeId: string,
    subjectId: string,
    callerSchoolId?: string | null,
    callerRole?: UserRole,
  ): Promise<void> {
    await this.getAndVerifyGradeAccess(gradeId, callerSchoolId, callerRole);
    await this.getAndVerifySubjectAccess(subjectId, callerSchoolId, callerRole);

    const existingAssignment = await this.repo.findGradeSubject(gradeId, subjectId);
    if (!existingAssignment) {
      throw new NotFoundError('Subject assignment not found for this grade');
    }

    await this.repo.removeGradeAssignment(gradeId, subjectId);
  }

  /**
   * Soft-delete master subject and cascade remove grade assignments.
   */
  async deleteSubject(
    subjectId: string,
    callerSchoolId?: string | null,
    callerRole?: UserRole,
  ): Promise<void> {
    await this.getAndVerifySubjectAccess(subjectId, callerSchoolId, callerRole);

    await this.repo.softDelete(subjectId);
    await this.repo.cascadeRemoveGradeAssignments(subjectId);
  }

  /**
   * List subjects associated with a grade with cursor-based pagination.
   */
  async listSubjectsByGrade(
    gradeId: string,
    query: ListSubjectsQuery,
    callerSchoolId?: string | null,
    callerRole?: UserRole,
  ): Promise<PaginatedResult<GradeSubjectItem>> {
    await this.getAndVerifyGradeAccess(gradeId, callerSchoolId, callerRole);

    const cursor = query.cursor ? decodeCursor(query.cursor) : undefined;
    const rawItems = await this.repo.listSubjectsByGrade(
      gradeId,
      query.limit,
      cursor ?? undefined,
      {
        status: query.status,
        search: query.search,
      },
    );

    return buildPaginatedResponse(rawItems, query.limit, (item) => ({
      createdAt: item.createdAt,
      id: item.gradeSubjectId,
    }));
  }
}

export const subjectsService = new SubjectsService();
