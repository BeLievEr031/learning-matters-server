import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PrincipalsService } from './principals.service.js';
import { PrincipalsRepository } from './principals.repository.js';
import { SchoolsRepository } from '../schools/schools.repository.js';
import { UsersRepository, type UserSafe } from '../users/users.repository.js';
import type { Principal } from '../../db/schema/principals.js';
import type { School } from '../../db/schema/schools.js';
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
  ConflictError,
} from '../../lib/app-error.js';

describe('PrincipalsService', () => {
  let service: PrincipalsService;
  let mockPrincipalsRepo: PrincipalsRepository;
  let mockSchoolsRepo: SchoolsRepository;
  let mockUsersRepo: UsersRepository;

  const schoolId = '11111111-1111-4111-a111-111111111111';
  const otherSchoolId = '22222222-2222-4222-a222-222222222222';
  const userId = '33333333-3333-4333-a333-333333333333';

  const mockSchool: School = {
    id: schoolId,
    name: 'Springfield Elementary',
    code: 'SPFLD',
    address: null,
    city: null,
    state: null,
    country: null,
    phone: null,
    email: null,
    website: null,
    logoUrl: null,
    status: 'active',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    deletedAt: null,
  };

  const mockPrincipalUser: UserSafe = {
    id: userId,
    email: 'skinner@springfield.edu',
    role: 'principal',
    schoolId,
    firstName: 'Seymour',
    lastName: 'Skinner',
    phone: null,
    status: 'active',
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    deletedAt: null,
  };

  const mockPrincipal: Principal = {
    id: '55555555-5555-4555-a555-555555555555',
    schoolId,
    userId,
    employeeId: 'PRIN-001',
    firstName: 'Seymour',
    lastName: 'Skinner',
    email: 'skinner@springfield.edu',
    phone: null,
    status: 'active',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  };

  beforeEach(() => {
    mockPrincipalsRepo = new PrincipalsRepository();
    mockSchoolsRepo = new SchoolsRepository();
    mockUsersRepo = new UsersRepository();
    service = new PrincipalsService(mockPrincipalsRepo, mockSchoolsRepo, mockUsersRepo);
  });

  describe('getPrincipal', () => {
    it('returns the principal profile for own school', async () => {
      vi.spyOn(mockSchoolsRepo, 'findById').mockResolvedValue(mockSchool);
      const findSpy = vi
        .spyOn(mockPrincipalsRepo, 'findBySchoolId')
        .mockResolvedValue(mockPrincipal);

      const result = await service.getPrincipal(schoolId, schoolId, 'admin');

      expect(result).toEqual(mockPrincipal);
      expect(findSpy).toHaveBeenCalledWith(schoolId);
    });

    it('allows super_admin to view principal of any school', async () => {
      vi.spyOn(mockSchoolsRepo, 'findById').mockResolvedValue(mockSchool);
      vi.spyOn(mockPrincipalsRepo, 'findBySchoolId').mockResolvedValue(mockPrincipal);

      const result = await service.getPrincipal(schoolId, null, 'super_admin');

      expect(result).toEqual(mockPrincipal);
    });

    it('throws NotFoundError if school does not exist', async () => {
      vi.spyOn(mockSchoolsRepo, 'findById').mockResolvedValue(null);

      await expect(service.getPrincipal(schoolId, schoolId, 'admin')).rejects.toThrow(
        NotFoundError,
      );
    });

    it('throws ForbiddenError if caller belongs to another school', async () => {
      vi.spyOn(mockSchoolsRepo, 'findById').mockResolvedValue(mockSchool);

      await expect(service.getPrincipal(schoolId, otherSchoolId, 'admin')).rejects.toThrow(
        ForbiddenError,
      );
    });

    it('throws NotFoundError if principal profile does not exist', async () => {
      vi.spyOn(mockSchoolsRepo, 'findById').mockResolvedValue(mockSchool);
      vi.spyOn(mockPrincipalsRepo, 'findBySchoolId').mockResolvedValue(null);

      await expect(service.getPrincipal(schoolId, schoolId, 'admin')).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe('upsertPrincipal', () => {
    const input = {
      userId,
      employeeId: 'PRIN-001',
      firstName: 'Seymour',
      lastName: 'Skinner',
      email: 'skinner@springfield.edu',
      status: 'active' as const,
    };

    it('creates or updates principal profile successfully', async () => {
      vi.spyOn(mockSchoolsRepo, 'findById').mockResolvedValue(mockSchool);
      vi.spyOn(mockUsersRepo, 'findById').mockResolvedValue(mockPrincipalUser);
      vi.spyOn(mockPrincipalsRepo, 'findByUserId').mockResolvedValue(null);
      const upsertSpy = vi.spyOn(mockPrincipalsRepo, 'upsert').mockResolvedValue(mockPrincipal);

      const result = await service.upsertPrincipal(schoolId, input, schoolId, 'admin');

      expect(result).toEqual(mockPrincipal);
      expect(upsertSpy).toHaveBeenCalledWith(schoolId, input);
    });

    it('throws NotFoundError if school does not exist', async () => {
      vi.spyOn(mockSchoolsRepo, 'findById').mockResolvedValue(null);

      await expect(service.upsertPrincipal(schoolId, input, schoolId, 'admin')).rejects.toThrow(
        NotFoundError,
      );
    });

    it('throws ForbiddenError if caller belongs to another school', async () => {
      vi.spyOn(mockSchoolsRepo, 'findById').mockResolvedValue(mockSchool);

      await expect(
        service.upsertPrincipal(schoolId, input, otherSchoolId, 'admin'),
      ).rejects.toThrow(ForbiddenError);
    });

    it('throws BadRequestError if user not found', async () => {
      vi.spyOn(mockSchoolsRepo, 'findById').mockResolvedValue(mockSchool);
      vi.spyOn(mockUsersRepo, 'findById').mockResolvedValue(null);

      await expect(service.upsertPrincipal(schoolId, input, schoolId, 'admin')).rejects.toThrow(
        BadRequestError,
      );
    });

    it('throws BadRequestError if user role is not principal', async () => {
      vi.spyOn(mockSchoolsRepo, 'findById').mockResolvedValue(mockSchool);
      vi.spyOn(mockUsersRepo, 'findById').mockResolvedValue({
        ...mockPrincipalUser,
        role: 'teacher',
      });

      await expect(service.upsertPrincipal(schoolId, input, schoolId, 'admin')).rejects.toThrow(
        'User must have the principal role',
      );
    });

    it('throws BadRequestError if user belongs to a different school', async () => {
      vi.spyOn(mockSchoolsRepo, 'findById').mockResolvedValue(mockSchool);
      vi.spyOn(mockUsersRepo, 'findById').mockResolvedValue({
        ...mockPrincipalUser,
        schoolId: otherSchoolId,
      });

      await expect(service.upsertPrincipal(schoolId, input, schoolId, 'admin')).rejects.toThrow(
        'User belongs to a different school',
      );
    });

    it('throws ConflictError if user is already principal of another school', async () => {
      vi.spyOn(mockSchoolsRepo, 'findById').mockResolvedValue(mockSchool);
      vi.spyOn(mockUsersRepo, 'findById').mockResolvedValue({
        ...mockPrincipalUser,
        schoolId: null,
      });
      vi.spyOn(mockPrincipalsRepo, 'findByUserId').mockResolvedValue({
        ...mockPrincipal,
        schoolId: otherSchoolId,
      });

      await expect(service.upsertPrincipal(schoolId, input, schoolId, 'admin')).rejects.toThrow(
        ConflictError,
      );
    });
  });
});
