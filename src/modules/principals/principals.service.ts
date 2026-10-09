import { principalsRepository, type PrincipalsRepository } from './principals.repository.js';
import { schoolsRepository, type SchoolsRepository } from '../schools/schools.repository.js';
import { usersRepository, type UsersRepository } from '../users/users.repository.js';
import type { UpsertPrincipalInput } from './principals.schemas.js';
import type { Principal } from '../../db/schema/principals.js';
import type { UserRole } from '../../db/schema/users.js';
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
  ConflictError,
} from '../../lib/app-error.js';

export class PrincipalsService {
  constructor(
    private readonly repo: PrincipalsRepository = principalsRepository,
    private readonly schoolsRepo: SchoolsRepository = schoolsRepository,
    private readonly usersRepo: UsersRepository = usersRepository,
  ) {}

  /**
   * Get the principal profile for a school.
   */
  async getPrincipal(
    schoolId: string,
    callerSchoolId?: string | null,
    callerRole?: UserRole,
  ): Promise<Principal> {
    const school = await this.schoolsRepo.findById(schoolId);
    if (!school) {
      throw new NotFoundError('School not found');
    }

    if (callerRole !== 'super_admin' && callerSchoolId !== schoolId) {
      throw new ForbiddenError('Forbidden: Access to this school is not allowed');
    }

    const principal = await this.repo.findBySchoolId(schoolId);
    if (!principal) {
      throw new NotFoundError('Principal profile not found for this school');
    }

    return principal;
  }

  /**
   * Set or update the principal profile for a school.
   */
  async upsertPrincipal(
    schoolId: string,
    input: UpsertPrincipalInput,
    callerSchoolId?: string | null,
    callerRole?: UserRole,
  ): Promise<Principal> {
    const school = await this.schoolsRepo.findById(schoolId);
    if (!school) {
      throw new NotFoundError('School not found');
    }

    if (callerRole !== 'super_admin' && callerSchoolId !== schoolId) {
      throw new ForbiddenError('Forbidden: Access to this school is not allowed');
    }

    const user = await this.usersRepo.findById(input.userId);
    if (!user) {
      throw new BadRequestError('User not found');
    }

    if (user.role !== 'principal') {
      throw new BadRequestError('User must have the principal role');
    }

    if (user.schoolId && user.schoolId !== schoolId) {
      throw new BadRequestError('User belongs to a different school');
    }

    const existingForUser = await this.repo.findByUserId(input.userId);
    if (existingForUser && existingForUser.schoolId !== schoolId) {
      throw new ConflictError('User is already assigned as principal for another school');
    }

    return this.repo.upsert(schoolId, input);
  }
}

export const principalsService = new PrincipalsService();
