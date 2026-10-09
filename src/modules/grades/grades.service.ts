import { gradesRepository, type GradesRepository } from './grades.repository.js';
import { boardsRepository, type BoardsRepository } from '../boards/boards.repository.js';
import { teachersRepository, type TeachersRepository } from '../teachers/teachers.repository.js';
import { studentsRepository, type StudentsRepository } from '../students/students.repository.js';
import {
  teacherAssignmentsRepository,
  type TeacherAssignmentsRepository,
} from '../teacher-assignments/teacher-assignments.repository.js';
import type { Grade } from '../../db/schema/grades.js';
import type { Teacher } from '../../db/schema/teachers.js';
import type { CreateGradeInput, UpdateGradeInput, ListGradesQuery } from './grades.schemas.js';
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

export class GradesService {
  constructor(
    private readonly repo: GradesRepository = gradesRepository,
    private readonly boardsRepo: BoardsRepository = boardsRepository,
    private readonly teachersRepo: TeachersRepository = teachersRepository,
    private readonly studentsRepo: StudentsRepository = studentsRepository,
    private readonly teacherAssignmentsRepo: TeacherAssignmentsRepository = teacherAssignmentsRepository,
  ) {}

  /**
   * Verify board exists and that non-super_admin users can only access their school's board.
   */
  private async getAndVerifyBoardAccess(
    boardId: string,
    callerSchoolId?: string | null,
    callerRole?: UserRole,
  ) {
    const board = await this.boardsRepo.findById(boardId);
    if (!board) {
      throw new NotFoundError('Board not found');
    }

    if (callerRole && callerRole !== 'super_admin') {
      if (!callerSchoolId || board.schoolId !== callerSchoolId) {
        throw new ForbiddenError('Forbidden: Access to this board is not allowed');
      }
    }

    return board;
  }

  /**
   * Verify grade exists and that non-super_admin users can only access their school's grade.
   */
  private async getAndVerifyGradeAccess(
    gradeId: string,
    callerSchoolId?: string | null,
    callerRole?: UserRole,
  ): Promise<Grade> {
    const grade = await this.repo.findById(gradeId);
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
   * Create a new grade/class within a board.
   * Enforces uniqueness on (board_id, grade_number, section).
   */
  async createGrade(
    boardId: string,
    input: CreateGradeInput,
    callerSchoolId?: string | null,
    callerRole?: UserRole,
  ): Promise<Grade> {
    const board = await this.getAndVerifyBoardAccess(boardId, callerSchoolId, callerRole);

    const normalizedCode = input.code.trim().toUpperCase();
    const normalizedSection = input.section ? input.section.trim().toUpperCase() : null;

    const existing = await this.repo.findByBoardGradeAndSection(
      boardId,
      input.gradeNumber,
      normalizedSection,
    );
    if (existing) {
      throw new ConflictError('Grade with this number and section already exists for this board');
    }

    return this.repo.create({
      schoolId: board.schoolId,
      boardId,
      name: input.name.trim(),
      code: normalizedCode,
      gradeNumber: input.gradeNumber,
      section: normalizedSection,
      capacity: input.capacity,
      status: input.status,
    });
  }

  /**
   * Retrieve a grade by ID with school-scoped access check.
   */
  async getGradeById(
    gradeId: string,
    callerSchoolId?: string | null,
    callerRole?: UserRole,
  ): Promise<Grade> {
    return this.getAndVerifyGradeAccess(gradeId, callerSchoolId, callerRole);
  }

  /**
   * Update an existing grade.
   * Enforces uniqueness if gradeNumber or section is updated.
   */
  async updateGrade(
    gradeId: string,
    input: UpdateGradeInput,
    callerSchoolId?: string | null,
    callerRole?: UserRole,
  ): Promise<Grade> {
    const grade = await this.getAndVerifyGradeAccess(gradeId, callerSchoolId, callerRole);

    const targetGradeNumber = input.gradeNumber ?? grade.gradeNumber;
    const targetSection =
      input.section !== undefined
        ? input.section
          ? input.section.trim().toUpperCase()
          : null
        : grade.section;

    const isGradeNumberChanged =
      input.gradeNumber !== undefined && input.gradeNumber !== grade.gradeNumber;
    const isSectionChanged = input.section !== undefined && targetSection !== grade.section;

    if (isGradeNumberChanged || isSectionChanged) {
      const conflict = await this.repo.findByBoardGradeAndSection(
        grade.boardId,
        targetGradeNumber,
        targetSection,
      );
      if (conflict && conflict.id !== gradeId) {
        throw new ConflictError('Grade with this number and section already exists for this board');
      }
    }

    const updated = await this.repo.update(gradeId, input);
    if (!updated) {
      throw new NotFoundError('Grade not found');
    }

    return updated;
  }

  /**
   * Soft-delete a grade with school-scoped access control.
   */
  async deleteGrade(
    gradeId: string,
    callerSchoolId?: string | null,
    callerRole?: UserRole,
  ): Promise<void> {
    await this.getAndVerifyGradeAccess(gradeId, callerSchoolId, callerRole);

    const hasActiveStudents = await this.studentsRepo.hasActiveStudentsByGrade(gradeId);
    if (hasActiveStudents) {
      throw new ConflictError('Cannot delete grade with active enrolled students');
    }

    const hasActiveAssignments =
      await this.teacherAssignmentsRepo.hasActiveAssignmentsByGrade(gradeId);
    if (hasActiveAssignments) {
      throw new ConflictError('Cannot delete grade with active teacher assignments');
    }

    await this.repo.softDelete(gradeId);
  }

  /**
   * List grades under a board with cursor pagination and status/section filters.
   */
  async listGradesByBoard(
    boardId: string,
    query: ListGradesQuery,
    callerSchoolId?: string | null,
    callerRole?: UserRole,
  ): Promise<PaginatedResult<Grade>> {
    await this.getAndVerifyBoardAccess(boardId, callerSchoolId, callerRole);

    const cursor = query.cursor ? decodeCursor(query.cursor) : undefined;
    const rawItems = await this.repo.listByBoard(boardId, query.limit, cursor ?? undefined, {
      status: query.status,
      section: query.section,
      gradeNumber: query.gradeNumber,
      search: query.search,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });

    return buildPaginatedResponse(rawItems, query.limit, (grade) => ({
      createdAt: grade.createdAt,
      id: grade.id,
    }));
  }

  /**
   * Assign or remove a class teacher for a grade.
   */
  async assignClassTeacher(
    gradeId: string,
    teacherId: string | null,
    callerSchoolId?: string | null,
    callerRole?: UserRole,
  ): Promise<Grade> {
    const grade = await this.getAndVerifyGradeAccess(gradeId, callerSchoolId, callerRole);

    if (grade.status !== 'active') {
      throw new BadRequestError('Cannot assign class teacher to an inactive grade');
    }

    if (teacherId !== null) {
      const teacher = await this.teachersRepo.findById(teacherId);
      if (!teacher) {
        throw new NotFoundError('Teacher not found');
      }

      if (teacher.schoolId !== grade.schoolId) {
        throw new BadRequestError('Teacher must belong to the same school as the grade');
      }

      if (teacher.status !== 'active') {
        throw new BadRequestError('Teacher is not active');
      }
    }

    const updated = await this.repo.setClassTeacher(gradeId, teacherId);
    if (!updated) {
      throw new NotFoundError('Grade not found');
    }

    return updated;
  }

  /**
   * Retrieve the class teacher currently assigned to a grade.
   */
  async getClassTeacher(
    gradeId: string,
    callerSchoolId?: string | null,
    callerRole?: UserRole,
  ): Promise<Teacher | null> {
    const grade = await this.getAndVerifyGradeAccess(gradeId, callerSchoolId, callerRole);

    if (!grade.classTeacherId) {
      return null;
    }

    const teacher = await this.teachersRepo.findById(grade.classTeacherId);
    return teacher;
  }
}

export const gradesService = new GradesService();
