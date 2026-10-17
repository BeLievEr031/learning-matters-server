import argon2 from 'argon2';
import {
  studentsRepository,
  type StudentsRepository,
  type StudentProfileResult,
  type StudentAssignedSubjectResult,
} from './students.repository.js';
import { gradesRepository, type GradesRepository } from '../grades/grades.repository.js';
import { usersRepository, type UsersRepository } from '../users/users.repository.js';
import { teachersRepository, type TeachersRepository } from '../teachers/teachers.repository.js';
import type { Student } from '../../db/schema/students.js';
import type {
  CreateStudentInput,
  UpdateStudentInput,
  TransferStudentInput,
  ListStudentsQuery,
} from './students.schemas.js';
import type { UserRole } from '../../db/schema/users.js';
import {
  NotFoundError,
  ConflictError,
  ForbiddenError,
  BadRequestError,
} from '../../lib/app-error.js';
import {
  DEFAULT_PAGE_SIZE,
  ARGON2_MEMORY_COST,
  ARGON2_TIME_COST,
  ARGON2_PARALLELISM,
  DEFAULT_STUDENT_PASSWORD,
} from '../../config/constants.js';
import { withTransaction, type Transaction } from '../../db/transaction.js';
import {
  decodeCursor,
  buildPaginatedResponse,
  type PaginatedResult,
} from '../../lib/pagination.js';

export class StudentsService {
  constructor(
    private readonly repo: StudentsRepository = studentsRepository,
    private readonly gradesRepo: GradesRepository = gradesRepository,
    private readonly usersRepo: UsersRepository = usersRepository,
    private readonly teachersRepo: TeachersRepository = teachersRepository,
    private readonly txRunner: <T>(
      fn: (tx: Transaction) => Promise<T>,
    ) => Promise<T> = withTransaction,
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
    if (callerRole !== 'super_admin' && grade.schoolId !== callerSchoolId) {
      throw new ForbiddenError('Forbidden: Cannot access grades from another school');
    }
    return grade;
  }

  /**
   * Create a student under a grade.
   */
  async createStudent(
    gradeId: string,
    input: CreateStudentInput,
    callerSchoolId?: string | null,
    callerRole?: UserRole,
  ): Promise<Student> {
    const grade = await this.getAndVerifyGradeAccess(gradeId, callerSchoolId, callerRole);

    if (grade.status !== 'active') {
      throw new BadRequestError('Cannot add student to an inactive or archived grade');
    }

    const normalizedAdmissionNumber = input.admissionNumber.trim();
    const existing = await this.repo.findBySchoolAndAdmissionNumber(
      grade.schoolId,
      normalizedAdmissionNumber,
    );
    if (existing) {
      throw new ConflictError('Student with this admission number already exists for this school');
    }

    if (input.userId) {
      const user = await this.usersRepo.findById(input.userId);
      if (!user) {
        throw new NotFoundError('Linked user account not found');
      }
      if (user.schoolId && user.schoolId !== grade.schoolId) {
        throw new ForbiddenError('Linked user account belongs to a different school');
      }

      return this.repo.create({
        schoolId: grade.schoolId,
        boardId: grade.boardId,
        gradeId: grade.id,
        admissionNumber: normalizedAdmissionNumber,
        firstName: input.firstName,
        lastName: input.lastName,
        dateOfBirth: input.dateOfBirth,
        gender: input.gender,
        email: input.email,
        phone: input.phone,
        guardianName: input.guardianName,
        guardianPhone: input.guardianPhone,
        guardianEmail: input.guardianEmail,
        address: input.address,
        userId: input.userId,
        status: input.status,
      });
    }

    // Auto-create User account with dummy password if userId was not provided and email exists
    if (input.email) {
      const normalizedEmail = input.email.trim().toLowerCase();
      const existingUser = await this.usersRepo.findByEmail(normalizedEmail);
      if (existingUser) {
        throw new ConflictError('A user account with this email already exists');
      }

      const passwordHash = await argon2.hash(DEFAULT_STUDENT_PASSWORD, {
        memoryCost: ARGON2_MEMORY_COST,
        timeCost: ARGON2_TIME_COST,
        parallelism: ARGON2_PARALLELISM,
      });

      return this.txRunner(async (tx) => {
        const createdUser = await this.usersRepo.create(
          {
            email: normalizedEmail,
            passwordHash,
            role: 'student',
            schoolId: grade.schoolId,
            firstName: input.firstName,
            lastName: input.lastName,
            phone: input.phone ?? null,
          },
          tx,
        );

        return this.repo.create(
          {
            schoolId: grade.schoolId,
            boardId: grade.boardId,
            gradeId: grade.id,
            admissionNumber: normalizedAdmissionNumber,
            firstName: input.firstName,
            lastName: input.lastName,
            dateOfBirth: input.dateOfBirth,
            gender: input.gender,
            email: normalizedEmail,
            phone: input.phone,
            guardianName: input.guardianName,
            guardianPhone: input.guardianPhone,
            guardianEmail: input.guardianEmail,
            address: input.address,
            userId: createdUser.id,
            status: input.status,
          },
          tx,
        );
      });
    }

    return this.repo.create({
      schoolId: grade.schoolId,
      boardId: grade.boardId,
      gradeId: grade.id,
      admissionNumber: normalizedAdmissionNumber,
      firstName: input.firstName,
      lastName: input.lastName,
      dateOfBirth: input.dateOfBirth,
      gender: input.gender,
      email: input.email,
      phone: input.phone,
      guardianName: input.guardianName,
      guardianPhone: input.guardianPhone,
      guardianEmail: input.guardianEmail,
      address: input.address,
      userId: null,
      status: input.status,
    });
  }

  /**
   * Get the authenticated student's profile by user ID.
   */
  async getMyProfile(callerUserId: string): Promise<StudentProfileResult> {
    const profile = await this.repo.findProfileByUserId(callerUserId);
    if (!profile) {
      throw new NotFoundError('Student profile not found');
    }

    if (profile.status !== 'active') {
      throw new ForbiddenError('Student account is not active');
    }

    return profile;
  }

  /**
   * Get subjects assigned to the authenticated student's grade.
   */
  async getMyAssignedSubjects(callerUserId: string): Promise<StudentAssignedSubjectResult[]> {
    const profile = await this.getMyProfile(callerUserId);
    return this.repo.findAssignedSubjectsByGradeId(profile.gradeId);
  }

  /**
   * List students in a grade with cursor-based pagination.
   */
  async listStudentsByGrade(
    gradeId: string,
    query: Partial<ListStudentsQuery> = {},
    callerSchoolId?: string | null,
    callerRole?: UserRole,
    callerUserId?: string,
  ): Promise<PaginatedResult<Student>> {
    const grade = await this.getAndVerifyGradeAccess(gradeId, callerSchoolId, callerRole);

    if (callerRole === 'teacher' || callerRole === 'class_teacher') {
      if (!callerUserId) {
        throw new ForbiddenError('Forbidden: Insufficient permissions');
      }
      const teacherProfile = await this.teachersRepo.findByUserId(callerUserId);
      if (!teacherProfile) {
        throw new ForbiddenError('Forbidden: Teacher profile not found');
      }
      const isClassTeacher = grade.classTeacherId === teacherProfile.id;
      const hasAssignment =
        isClassTeacher ||
        (await this.teachersRepo.hasTeacherGradeAssignment(teacherProfile.id, gradeId));
      if (!hasAssignment) {
        throw new ForbiddenError(
          'Forbidden: Teachers can only view students in their assigned grade',
        );
      }
    }

    const limit = query.limit ?? DEFAULT_PAGE_SIZE;
    const cursor = query.cursor ? (decodeCursor(query.cursor) ?? undefined) : undefined;
    const rawItems = await this.repo.listByGrade(gradeId, limit, cursor, {
      status: query.status,
      gender: query.gender,
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
   * Retrieve student by ID.
   * Accessible by super_admin, school staff, or the student themselves.
   */
  async getStudentById(
    studentId: string,
    callerSchoolId?: string | null,
    callerRole?: UserRole,
    callerUserId?: string,
  ): Promise<Student> {
    const student = await this.repo.findById(studentId);
    if (!student) {
      throw new NotFoundError('Student not found');
    }

    if (callerRole === 'super_admin') {
      return student;
    }

    if (callerUserId && student.userId === callerUserId) {
      return student;
    }

    if (callerRole === 'student') {
      throw new ForbiddenError('Forbidden: Students can only view their own profile');
    }

    if (student.schoolId !== callerSchoolId) {
      throw new ForbiddenError('Forbidden: Cannot access student from another school');
    }

    return student;
  }

  /**
   * Update student details.
   */
  async updateStudent(
    studentId: string,
    input: UpdateStudentInput,
    callerSchoolId?: string | null,
    callerRole?: UserRole,
  ): Promise<Student> {
    const student = await this.repo.findById(studentId);
    if (!student) {
      throw new NotFoundError('Student not found');
    }

    if (callerRole !== 'super_admin' && student.schoolId !== callerSchoolId) {
      throw new ForbiddenError('Forbidden: Cannot modify student from another school');
    }

    if (input.admissionNumber) {
      const normalizedAdmissionNumber = input.admissionNumber.trim();
      if (normalizedAdmissionNumber.toLowerCase() !== student.admissionNumber.toLowerCase()) {
        const conflict = await this.repo.findBySchoolAndAdmissionNumber(
          student.schoolId,
          normalizedAdmissionNumber,
        );
        if (conflict && conflict.id !== studentId) {
          throw new ConflictError(
            'Student with this admission number already exists for this school',
          );
        }
      }
    }

    if (input.userId) {
      const user = await this.usersRepo.findById(input.userId);
      if (!user) {
        throw new NotFoundError('Linked user account not found');
      }
      if (user.schoolId && user.schoolId !== student.schoolId) {
        throw new ForbiddenError('Linked user account belongs to a different school');
      }
    }

    const updated = await this.repo.update(studentId, input);
    if (!updated) {
      throw new NotFoundError('Student not found');
    }

    return updated;
  }

  /**
   * Transfer student to another grade within the same school.
   */
  async transferStudent(
    studentId: string,
    input: TransferStudentInput,
    callerSchoolId?: string | null,
    callerRole?: UserRole,
  ): Promise<Student> {
    const student = await this.repo.findById(studentId);
    if (!student) {
      throw new NotFoundError('Student not found');
    }

    if (callerRole !== 'super_admin' && student.schoolId !== callerSchoolId) {
      throw new ForbiddenError('Forbidden: Cannot transfer student from another school');
    }

    const targetGrade = await this.gradesRepo.findById(input.targetGradeId);
    if (!targetGrade) {
      throw new NotFoundError('Target grade not found');
    }

    if (targetGrade.schoolId !== student.schoolId) {
      throw new BadRequestError('Cannot transfer student to a grade in another school');
    }

    if (targetGrade.status !== 'active') {
      throw new BadRequestError('Cannot transfer student to an inactive or archived grade');
    }

    const transferred = await this.repo.transfer(studentId, targetGrade.id, targetGrade.boardId);
    if (!transferred) {
      throw new NotFoundError('Student not found');
    }

    return transferred;
  }

  /**
   * Soft-delete a student.
   */
  async deleteStudent(
    studentId: string,
    callerSchoolId?: string | null,
    callerRole?: UserRole,
  ): Promise<void> {
    const student = await this.repo.findById(studentId);
    if (!student) {
      throw new NotFoundError('Student not found');
    }

    if (callerRole !== 'super_admin' && student.schoolId !== callerSchoolId) {
      throw new ForbiddenError('Forbidden: Cannot delete student from another school');
    }

    await this.repo.softDelete(studentId);
  }
}

export const studentsService = new StudentsService();
