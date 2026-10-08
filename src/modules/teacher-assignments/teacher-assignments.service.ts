import {
  teacherAssignmentsRepository,
  type TeacherAssignmentsRepository,
  type TeacherAssignmentDetail,
} from './teacher-assignments.repository.js';
import { teachersRepository, type TeachersRepository } from '../teachers/teachers.repository.js';
import { gradesRepository, type GradesRepository } from '../grades/grades.repository.js';
import { subjectsRepository, type SubjectsRepository } from '../subjects/subjects.repository.js';
import type { TeacherAssignment } from '../../db/schema/teacher-assignments.js';
import type {
  CreateTeacherAssignmentInput,
  UpdateTeacherAssignmentInput,
  ListTeacherAssignmentsQuery,
} from './teacher-assignments.schemas.js';
import type { UserRole } from '../../db/schema/users.js';
import {
  NotFoundError,
  ConflictError,
  ForbiddenError,
  BadRequestError,
} from '../../lib/app-error.js';
import { DEFAULT_PAGE_SIZE } from '../../config/constants.js';
import {
  decodeCursor,
  buildPaginatedResponse,
  type PaginatedResult,
} from '../../lib/pagination.js';

export class TeacherAssignmentsService {
  constructor(
    private readonly repo: TeacherAssignmentsRepository = teacherAssignmentsRepository,
    private readonly teachersRepo: TeachersRepository = teachersRepository,
    private readonly gradesRepo: GradesRepository = gradesRepository,
    private readonly subjectsRepo: SubjectsRepository = subjectsRepository,
  ) {}

  /**
   * Create a new teacher assignment.
   */
  async createAssignment(
    input: CreateTeacherAssignmentInput,
    callerUserId?: string,
    callerSchoolId?: string | null,
    callerRole?: UserRole,
  ): Promise<TeacherAssignment> {
    const teacher = await this.teachersRepo.findById(input.teacherId);
    if (!teacher) {
      throw new NotFoundError('Teacher not found');
    }
    if (teacher.status !== 'active') {
      throw new BadRequestError('Cannot assign an inactive teacher');
    }

    const grade = await this.gradesRepo.findById(input.gradeId);
    if (!grade) {
      throw new NotFoundError('Grade not found');
    }
    if (grade.status !== 'active') {
      throw new BadRequestError('Cannot assign to an inactive grade');
    }

    const subject = await this.subjectsRepo.findById(input.subjectId);
    if (!subject) {
      throw new NotFoundError('Subject not found');
    }
    if (subject.status !== 'active') {
      throw new BadRequestError('Cannot assign an inactive subject');
    }

    // Caller school isolation for non-super_admin
    if (callerRole !== 'super_admin') {
      if (
        teacher.schoolId !== callerSchoolId ||
        grade.schoolId !== callerSchoolId ||
        subject.schoolId !== callerSchoolId
      ) {
        throw new ForbiddenError('Forbidden: Cannot create assignments for another school');
      }
    }

    // Cross-entity school check
    if (teacher.schoolId !== grade.schoolId || teacher.schoolId !== subject.schoolId) {
      throw new BadRequestError('Teacher, grade, and subject must belong to the same school');
    }

    // Subject must be assigned to the selected grade (via grade_subjects)
    const gradeSubject = await this.subjectsRepo.findGradeSubject(grade.id, subject.id);
    if (gradeSubject?.status !== 'active') {
      throw new BadRequestError('Subject is not assigned to the selected grade');
    }

    // Check duplicate assignment
    const existing = await this.repo.findByTeacherGradeSubject(teacher.id, grade.id, subject.id);
    if (existing) {
      throw new ConflictError('Teacher is already assigned to this grade and subject');
    }

    return this.repo.create({
      schoolId: teacher.schoolId,
      teacherId: teacher.id,
      gradeId: grade.id,
      subjectId: subject.id,
      assignedBy: callerUserId ?? null,
      status: input.status,
      effectiveDate: input.effectiveDate,
    });
  }

  /**
   * List teacher assignments with cursor-based pagination and filters.
   */
  async listAssignments(
    query: Partial<ListTeacherAssignmentsQuery> = {},
    callerSchoolId?: string | null,
    callerRole?: UserRole,
  ): Promise<PaginatedResult<TeacherAssignmentDetail>> {
    let schoolId: string | undefined;

    if (callerRole === 'super_admin') {
      schoolId = query.schoolId;
    } else {
      if (query.schoolId && query.schoolId !== callerSchoolId) {
        throw new ForbiddenError('Forbidden: Cannot view assignments for another school');
      }
      schoolId = callerSchoolId ?? undefined;
    }

    const limit = query.limit ?? DEFAULT_PAGE_SIZE;
    const cursor = query.cursor ? (decodeCursor(query.cursor) ?? undefined) : undefined;

    const rawItems = await this.repo.list(limit, cursor, {
      schoolId,
      teacherId: query.teacherId,
      gradeId: query.gradeId,
      subjectId: query.subjectId,
      status: query.status,
    });

    return buildPaginatedResponse(rawItems, limit, (item) => ({
      createdAt: item.createdAt,
      id: item.id,
    }));
  }

  /**
   * Get assignment by ID.
   */
  async getAssignmentById(
    id: string,
    callerSchoolId?: string | null,
    callerRole?: UserRole,
  ): Promise<TeacherAssignmentDetail> {
    const assignment = await this.repo.findById(id);
    if (!assignment) {
      throw new NotFoundError('Teacher assignment not found');
    }

    if (callerRole !== 'super_admin' && assignment.schoolId !== callerSchoolId) {
      throw new ForbiddenError('Forbidden: Cannot access assignment from another school');
    }

    return assignment;
  }

  /**
   * List all assignments for a specific teacher.
   */
  async getAssignmentsByTeacher(
    teacherId: string,
    callerSchoolId?: string | null,
    callerRole?: UserRole,
  ): Promise<TeacherAssignmentDetail[]> {
    const teacher = await this.teachersRepo.findById(teacherId);
    if (!teacher) {
      throw new NotFoundError('Teacher not found');
    }

    if (callerRole !== 'super_admin' && teacher.schoolId !== callerSchoolId) {
      throw new ForbiddenError('Forbidden: Cannot access teacher assignments from another school');
    }

    return this.repo.listByTeacher(teacherId);
  }

  /**
   * List all teachers assigned to a specific grade.
   */
  async getTeachersByGrade(
    gradeId: string,
    callerSchoolId?: string | null,
    callerRole?: UserRole,
  ): Promise<TeacherAssignmentDetail[]> {
    const grade = await this.gradesRepo.findById(gradeId);
    if (!grade) {
      throw new NotFoundError('Grade not found');
    }

    if (callerRole !== 'super_admin' && grade.schoolId !== callerSchoolId) {
      throw new ForbiddenError('Forbidden: Cannot access grade assignments from another school');
    }

    return this.repo.listByGrade(gradeId);
  }

  /**
   * List all teachers assigned to a specific subject.
   */
  async getTeachersBySubject(
    subjectId: string,
    callerSchoolId?: string | null,
    callerRole?: UserRole,
  ): Promise<TeacherAssignmentDetail[]> {
    const subject = await this.subjectsRepo.findById(subjectId);
    if (!subject) {
      throw new NotFoundError('Subject not found');
    }

    if (callerRole !== 'super_admin' && subject.schoolId !== callerSchoolId) {
      throw new ForbiddenError('Forbidden: Cannot access subject assignments from another school');
    }

    return this.repo.listBySubject(subjectId);
  }

  /**
   * Update teacher assignment status or effective date.
   */
  async updateAssignment(
    id: string,
    input: UpdateTeacherAssignmentInput,
    callerSchoolId?: string | null,
    callerRole?: UserRole,
  ): Promise<TeacherAssignment> {
    const assignment = await this.repo.findById(id);
    if (!assignment) {
      throw new NotFoundError('Teacher assignment not found');
    }

    if (callerRole !== 'super_admin' && assignment.schoolId !== callerSchoolId) {
      throw new ForbiddenError('Forbidden: Cannot update assignment for another school');
    }

    const updated = await this.repo.update(id, input);
    if (!updated) {
      throw new NotFoundError('Teacher assignment not found');
    }

    return updated;
  }

  /**
   * Soft-delete a teacher assignment.
   */
  async deleteAssignment(
    id: string,
    callerSchoolId?: string | null,
    callerRole?: UserRole,
  ): Promise<void> {
    const assignment = await this.repo.findById(id);
    if (!assignment) {
      throw new NotFoundError('Teacher assignment not found');
    }

    if (callerRole !== 'super_admin' && assignment.schoolId !== callerSchoolId) {
      throw new ForbiddenError('Forbidden: Cannot delete assignment for another school');
    }

    await this.repo.softDelete(id);
  }
}

export const teacherAssignmentsService = new TeacherAssignmentsService();
