import argon2 from 'argon2';
import { teachersRepository, type TeachersRepository } from './teachers.repository.js';
import { schoolsRepository, type SchoolsRepository } from '../schools/schools.repository.js';
import { usersRepository, type UsersRepository } from '../users/users.repository.js';
import { gradesRepository, type GradesRepository } from '../grades/grades.repository.js';
import { subjectsRepository, type SubjectsRepository } from '../subjects/subjects.repository.js';
import {
  teacherAssignmentsRepository,
  type TeacherAssignmentsRepository,
} from '../teacher-assignments/teacher-assignments.repository.js';
import type { Teacher } from '../../db/schema/teachers.js';
import type {
  CreateTeacherInput,
  UpdateTeacherInput,
  ListTeachersQuery,
} from './teachers.schemas.js';
import type { UserRole } from '../../db/schema/users.js';
import { NotFoundError, ConflictError, ForbiddenError } from '../../lib/app-error.js';
import {
  DEFAULT_PAGE_SIZE,
  ARGON2_MEMORY_COST,
  ARGON2_TIME_COST,
  ARGON2_PARALLELISM,
  DEFAULT_TEACHER_PASSWORD,
} from '../../config/constants.js';
import { withTransaction, type Transaction } from '../../db/transaction.js';
import {
  decodeCursor,
  buildPaginatedResponse,
  type PaginatedResult,
} from '../../lib/pagination.js';

export class TeachersService {
  constructor(
    private readonly repo: TeachersRepository = teachersRepository,
    private readonly schoolsRepo: SchoolsRepository = schoolsRepository,
    private readonly usersRepo: UsersRepository = usersRepository,
    private readonly teacherAssignmentsRepo: TeacherAssignmentsRepository = teacherAssignmentsRepository,
    private readonly gradesRepo: GradesRepository = gradesRepository,
    private readonly subjectsRepo: SubjectsRepository = subjectsRepository,
    private readonly txRunner: <T>(
      fn: (tx: Transaction) => Promise<T>,
    ) => Promise<T> = withTransaction,
  ) {}

  /**
   * Verify school exists and that non-super_admin callers are restricted to their own school.
   */
  private async getAndVerifySchoolAccess(
    schoolId: string,
    callerSchoolId?: string | null,
    callerRole?: UserRole,
  ) {
    const school = await this.schoolsRepo.findById(schoolId);
    if (!school) {
      throw new NotFoundError('School not found');
    }
    if (callerRole !== 'super_admin' && schoolId !== callerSchoolId) {
      throw new ForbiddenError('Forbidden: Cannot access schools other than your own');
    }
    return school;
  }

  /**
   * Create a teacher under a school.
   */
  async createTeacher(
    schoolId: string,
    input: CreateTeacherInput,
    callerSchoolId?: string | null,
    callerRole?: UserRole,
  ): Promise<Teacher> {
    await this.getAndVerifySchoolAccess(schoolId, callerSchoolId, callerRole);

    const normalizedEmployeeId = input.employeeId.trim();
    const existingEmployee = await this.repo.findBySchoolAndEmployeeId(
      schoolId,
      normalizedEmployeeId,
    );
    if (existingEmployee) {
      throw new ConflictError('Teacher with this employee ID already exists for this school');
    }

    const normalizedEmail = input.email.trim().toLowerCase();
    const existingEmail = await this.repo.findBySchoolAndEmail(schoolId, normalizedEmail);
    if (existingEmail) {
      throw new ConflictError('Teacher with this email already exists for this school');
    }

    if (input.userId) {
      const user = await this.usersRepo.findById(input.userId);
      if (!user) {
        throw new NotFoundError('Linked user account not found');
      }
      if (user.schoolId && user.schoolId !== schoolId) {
        throw new ForbiddenError('Linked user account belongs to a different school');
      }

      return this.repo.create({
        schoolId,
        employeeId: normalizedEmployeeId,
        firstName: input.firstName,
        lastName: input.lastName,
        email: normalizedEmail,
        phone: input.phone,
        userId: input.userId,
        joiningDate: input.joiningDate,
        qualification: input.qualification,
        status: input.status,
      });
    }

    // Auto-create User account with dummy password if userId was not provided
    const existingUser = await this.usersRepo.findByEmail(normalizedEmail);
    if (existingUser) {
      throw new ConflictError('A user account with this email already exists');
    }

    const passwordHash = await argon2.hash(DEFAULT_TEACHER_PASSWORD, {
      memoryCost: ARGON2_MEMORY_COST,
      timeCost: ARGON2_TIME_COST,
      parallelism: ARGON2_PARALLELISM,
    });

    return this.txRunner(async (tx) => {
      const createdUser = await this.usersRepo.create(
        {
          email: normalizedEmail,
          passwordHash,
          role: 'teacher',
          schoolId,
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone ?? null,
        },
        tx,
      );

      return this.repo.create(
        {
          schoolId,
          employeeId: normalizedEmployeeId,
          firstName: input.firstName,
          lastName: input.lastName,
          email: normalizedEmail,
          phone: input.phone,
          userId: createdUser.id,
          joiningDate: input.joiningDate,
          qualification: input.qualification,
          status: input.status,
        },
        tx,
      );
    });
  }

  /**
   * List teachers under a school with pagination and filters.
   */
  async listTeachersBySchool(
    schoolId: string,
    query: Partial<ListTeachersQuery> = {},
    callerSchoolId?: string | null,
    callerRole?: UserRole,
  ): Promise<PaginatedResult<Teacher>> {
    await this.getAndVerifySchoolAccess(schoolId, callerSchoolId, callerRole);

    const limit = query.limit ?? DEFAULT_PAGE_SIZE;
    const cursor = query.cursor ? (decodeCursor(query.cursor) ?? undefined) : undefined;
    const rawItems = await this.repo.listBySchool(schoolId, limit, cursor, {
      status: query.status,
      search: query.search,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });

    return buildPaginatedResponse(rawItems, limit, (item) => ({
      createdAt: item.createdAt,
      id: item.id,
    }));
  }

  /**
   * Retrieve teacher by ID.
   * Accessible by super_admin, school admin/principal/teachers, or the teacher themselves.
   */
  async getTeacherById(
    teacherId: string,
    callerSchoolId?: string | null,
    callerRole?: UserRole,
    callerUserId?: string,
  ): Promise<Teacher> {
    const teacher = await this.repo.findById(teacherId);
    if (!teacher) {
      throw new NotFoundError('Teacher not found');
    }

    if (callerRole === 'super_admin') {
      return teacher;
    }

    if (callerUserId && teacher.userId === callerUserId) {
      return teacher;
    }

    if (callerRole === 'teacher') {
      throw new ForbiddenError('Forbidden: Teachers can only view their own profile');
    }

    if (teacher.schoolId !== callerSchoolId) {
      throw new ForbiddenError('Forbidden: Cannot access teacher from another school');
    }

    return teacher;
  }

  /**
   * Update teacher record.
   */
  async updateTeacher(
    teacherId: string,
    input: UpdateTeacherInput,
    callerSchoolId?: string | null,
    callerRole?: UserRole,
  ): Promise<Teacher> {
    const teacher = await this.repo.findById(teacherId);
    if (!teacher) {
      throw new NotFoundError('Teacher not found');
    }

    if (callerRole !== 'super_admin' && teacher.schoolId !== callerSchoolId) {
      throw new ForbiddenError('Forbidden: Cannot modify teacher from another school');
    }

    if (input.employeeId) {
      const normalizedEmployeeId = input.employeeId.trim();
      if (normalizedEmployeeId.toLowerCase() !== teacher.employeeId.toLowerCase()) {
        const conflict = await this.repo.findBySchoolAndEmployeeId(
          teacher.schoolId,
          normalizedEmployeeId,
        );
        if (conflict && conflict.id !== teacherId) {
          throw new ConflictError('Teacher with this employee ID already exists for this school');
        }
      }
    }

    if (input.email) {
      const normalizedEmail = input.email.trim().toLowerCase();
      if (normalizedEmail !== teacher.email.toLowerCase()) {
        const conflict = await this.repo.findBySchoolAndEmail(teacher.schoolId, normalizedEmail);
        if (conflict && conflict.id !== teacherId) {
          throw new ConflictError('Teacher with this email already exists for this school');
        }
      }
    }

    if (input.userId) {
      const user = await this.usersRepo.findById(input.userId);
      if (!user) {
        throw new NotFoundError('Linked user account not found');
      }
      if (user.schoolId && user.schoolId !== teacher.schoolId) {
        throw new ForbiddenError('Linked user account belongs to a different school');
      }
    }

    const updated = await this.repo.update(teacherId, input);
    if (!updated) {
      throw new NotFoundError('Teacher not found');
    }

    return updated;
  }

  /**
   * Soft-delete a teacher.
   */
  async deleteTeacher(
    teacherId: string,
    callerSchoolId?: string | null,
    callerRole?: UserRole,
  ): Promise<void> {
    const teacher = await this.repo.findById(teacherId);
    if (!teacher) {
      throw new NotFoundError('Teacher not found');
    }

    if (callerRole !== 'super_admin' && teacher.schoolId !== callerSchoolId) {
      throw new ForbiddenError('Forbidden: Cannot delete teacher from another school');
    }

    const hasActiveAssignments =
      await this.teacherAssignmentsRepo.hasActiveAssignmentsByTeacher(teacherId);
    if (hasActiveAssignments) {
      throw new ConflictError('Cannot delete teacher with active assignments');
    }

    await this.repo.softDelete(teacherId);
  }

  /**
   * Helper to resolve teacher record by linked user ID.
   */
  async resolveTeacherFromUserId(userId: string): Promise<Teacher> {
    const teacher = await this.repo.findByUserId(userId);
    if (!teacher) {
      throw new NotFoundError('Teacher profile not found for this user account');
    }
    return teacher;
  }

  /**
   * Feature 2: Get assigned grades for logged-in teacher.
   */
  async getMyAssignedGrades(callerUserId: string, callerSchoolId?: string | null) {
    const teacher = await this.resolveTeacherFromUserId(callerUserId);
    return this.repo.findAssignedGradesByTeacherId(teacher.id, callerSchoolId ?? teacher.schoolId);
  }

  /**
   * Feature 2: Get assigned grades by teacher ID with role verification.
   */
  async getTeacherAssignedGrades(
    teacherId: string,
    callerSchoolId?: string | null,
    callerRole?: UserRole,
    callerUserId?: string,
  ) {
    const teacher = await this.repo.findById(teacherId);
    if (!teacher) {
      throw new NotFoundError('Teacher not found');
    }

    if (callerRole === 'super_admin') {
      return this.repo.findAssignedGradesByTeacherId(teacher.id, teacher.schoolId);
    }

    if (callerRole === 'teacher' || callerRole === 'class_teacher') {
      if (!callerUserId || teacher.userId !== callerUserId) {
        throw new ForbiddenError('Forbidden: Teachers can only view their own assigned grades');
      }
      return this.repo.findAssignedGradesByTeacherId(teacher.id, teacher.schoolId);
    }

    if (callerSchoolId && teacher.schoolId !== callerSchoolId) {
      throw new ForbiddenError('Forbidden: Cannot access teachers from other schools');
    }

    return this.repo.findAssignedGradesByTeacherId(teacher.id, teacher.schoolId);
  }

  /**
   * Feature 3: Get assigned subjects in a grade for logged-in teacher.
   */
  async getMyAssignedGradeSubjects(callerUserId: string, gradeId: string) {
    const teacher = await this.resolveTeacherFromUserId(callerUserId);
    const grade = await this.gradesRepo.findById(gradeId);
    if (!grade) {
      throw new NotFoundError('Grade not found');
    }

    const hasAssignment = await this.repo.hasTeacherGradeAssignment(teacher.id, gradeId);
    const isClassTeacher = grade.classTeacherId === teacher.id;

    if (!hasAssignment && !isClassTeacher) {
      throw new ForbiddenError('Forbidden: You are not assigned to this grade');
    }

    const subjects = await this.repo.findAssignedSubjectsByTeacherAndGrade(teacher.id, gradeId);
    return {
      grade: {
        id: grade.id,
        name: grade.name,
      },
      subjects,
    };
  }

  /**
   * Feature 3: Get all assigned subjects across grades for logged-in teacher.
   */
  async getMyAllAssignedSubjects(callerUserId: string) {
    const teacher = await this.resolveTeacherFromUserId(callerUserId);
    return this.repo.findAllAssignedSubjectsByTeacher(teacher.id);
  }

  /**
   * Feature 4: Get assigned subject chapters for logged-in teacher.
   */
  async getMyAssignedSubjectChapters(callerUserId: string, subjectId: string) {
    const teacher = await this.resolveTeacherFromUserId(callerUserId);
    const subject = await this.subjectsRepo.findById(subjectId);
    if (!subject) {
      throw new NotFoundError('Subject not found');
    }

    const hasAssignment = await this.repo.hasTeacherSubjectAssignment(teacher.id, subjectId);
    if (!hasAssignment) {
      throw new ForbiddenError('Forbidden: You are not assigned to this subject');
    }

    const chapters = await this.repo.findChaptersBySubject(subjectId);
    return {
      subject: {
        id: subject.id,
        name: subject.name,
        code: subject.code,
      },
      chapters,
    };
  }
}

export const teachersService = new TeachersService();
