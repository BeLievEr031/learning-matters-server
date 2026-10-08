import { teachersRepository, type TeachersRepository } from './teachers.repository.js';
import { schoolsRepository, type SchoolsRepository } from '../schools/schools.repository.js';
import { usersRepository, type UsersRepository } from '../users/users.repository.js';
import type { Teacher } from '../../db/schema/teachers.js';
import type {
  CreateTeacherInput,
  UpdateTeacherInput,
  ListTeachersQuery,
} from './teachers.schemas.js';
import type { UserRole } from '../../db/schema/users.js';
import { NotFoundError, ConflictError, ForbiddenError } from '../../lib/app-error.js';
import { DEFAULT_PAGE_SIZE } from '../../config/constants.js';
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

    await this.repo.softDelete(teacherId);
  }
}

export const teachersService = new TeachersService();
