import { describe, it, expect, vi, beforeEach } from 'vitest';
import { principalsRepository } from './principals.repository.js';
import { db } from '../../db/pool.js';
import type { Principal } from '../../db/schema/principals.js';

describe('PrincipalsRepository', () => {
  const mockPrincipal: Principal = {
    id: '77777777-7777-4777-a777-777777777777',
    schoolId: '11111111-1111-4111-a111-111111111111',
    userId: '88888888-8888-4888-a888-888888888888',
    employeeId: 'PRIN-001',
    firstName: 'Seymour',
    lastName: 'Skinner',
    email: 'skinner@springfield.edu',
    phone: '+919876543210',
    status: 'active',
    createdAt: new Date('2026-01-01T12:00:00.000Z'),
    updatedAt: new Date('2026-01-01T12:00:00.000Z'),
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('findBySchoolId', () => {
    it('returns principal by schoolId when found', async () => {
      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockPrincipal]),
          }),
        }),
      } as never);

      const result = await principalsRepository.findBySchoolId(mockPrincipal.schoolId);
      expect(result).toEqual(mockPrincipal);
    });

    it('returns null when principal not found for school', async () => {
      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as never);

      const result = await principalsRepository.findBySchoolId('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('findByUserId', () => {
    it('returns principal by userId when found', async () => {
      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockPrincipal]),
          }),
        }),
      } as never);

      const result = await principalsRepository.findByUserId(mockPrincipal.userId);
      expect(result).toEqual(mockPrincipal);
    });
  });

  describe('upsert', () => {
    it('upserts and returns principal record', async () => {
      vi.spyOn(db, 'insert').mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoUpdate: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockPrincipal]),
          }),
        }),
      } as never);

      const result = await principalsRepository.upsert(mockPrincipal.schoolId, {
        userId: mockPrincipal.userId,
        employeeId: 'PRIN-001',
        firstName: 'Seymour',
        lastName: 'Skinner',
        email: 'skinner@springfield.edu',
        phone: '+919876543210',
        status: 'active',
      });

      expect(result).toEqual(mockPrincipal);
    });

    it('throws error when upsert fails to return a record', async () => {
      vi.spyOn(db, 'insert').mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoUpdate: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as never);

      await expect(
        principalsRepository.upsert(mockPrincipal.schoolId, {
          userId: mockPrincipal.userId,
          employeeId: 'PRIN-001',
          firstName: 'Seymour',
          lastName: 'Skinner',
          email: 'skinner@springfield.edu',
        }),
      ).rejects.toThrow('Failed to upsert principal');
    });
  });
});
