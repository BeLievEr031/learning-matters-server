import { describe, it, expect, vi, beforeEach } from 'vitest';
import { teachersRepository } from './teachers.repository.js';
import { db } from '../../db/pool.js';
import type { Teacher } from '../../db/schema/teachers.js';

describe('TeachersRepository', () => {
  const mockTeacher: Teacher = {
    id: '55555555-5555-4555-a555-555555555555',
    schoolId: '11111111-1111-4111-a111-111111111111',
    userId: '99999999-9999-4999-a999-999999999999',
    employeeId: 'EMP-001',
    firstName: 'Edna',
    lastName: 'Krabappel',
    email: 'edna@springfield.edu',
    phone: '+15559876543',
    joiningDate: new Date('2025-08-01T00:00:00.000Z'),
    qualification: 'M.Ed.',
    status: 'active',
    createdAt: new Date('2026-01-01T12:00:00.000Z'),
    updatedAt: new Date('2026-01-01T12:00:00.000Z'),
    deletedAt: null,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('findById', () => {
    it('returns teacher by id when found', async () => {
      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockTeacher]),
          }),
        }),
      } as never);

      const result = await teachersRepository.findById(mockTeacher.id);
      expect(result).toEqual(mockTeacher);
    });

    it('returns null when teacher not found', async () => {
      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as never);

      const result = await teachersRepository.findById('non-existent');
      expect(result).toBeNull();
    });

    it('allows including deleted records', async () => {
      const selectSpy = vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockTeacher]),
          }),
        }),
      } as never);

      await teachersRepository.findById(mockTeacher.id, true);
      expect(selectSpy).toHaveBeenCalled();
    });
  });

  describe('findBySchoolAndEmployeeId', () => {
    it('returns teacher by school and employeeId (case-insensitive)', async () => {
      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockTeacher]),
          }),
        }),
      } as never);

      const result = await teachersRepository.findBySchoolAndEmployeeId(
        mockTeacher.schoolId,
        'emp-001',
      );
      expect(result).toEqual(mockTeacher);
    });

    it('returns null when not found', async () => {
      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as never);

      const result = await teachersRepository.findBySchoolAndEmployeeId(
        mockTeacher.schoolId,
        'NONE',
      );
      expect(result).toBeNull();
    });
  });

  describe('findBySchoolAndEmail', () => {
    it('returns teacher by school and email (case-insensitive)', async () => {
      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockTeacher]),
          }),
        }),
      } as never);

      const result = await teachersRepository.findBySchoolAndEmail(
        mockTeacher.schoolId,
        'EDNA@SPRINGFIELD.EDU',
      );
      expect(result).toEqual(mockTeacher);
    });
  });

  describe('findByUserId', () => {
    it('returns teacher by userId when found', async () => {
      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockTeacher]),
          }),
        }),
      } as never);

      const result = await teachersRepository.findByUserId(
        mockTeacher.userId ?? '99999999-9999-4999-a999-999999999999',
      );
      expect(result).toEqual(mockTeacher);
    });
  });

  describe('create', () => {
    it('creates and returns teacher record', async () => {
      vi.spyOn(db, 'insert').mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockTeacher]),
        }),
      } as never);

      const result = await teachersRepository.create({
        schoolId: mockTeacher.schoolId,
        employeeId: 'EMP-001',
        firstName: 'Edna',
        lastName: 'Krabappel',
        email: 'edna@springfield.edu',
        phone: '+15559876543',
        userId: mockTeacher.userId,
        joiningDate: new Date('2025-08-01T00:00:00.000Z'),
        qualification: 'M.Ed.',
        status: 'active',
      });

      expect(result).toEqual(mockTeacher);
    });

    it('throws error when insert returns empty result', async () => {
      vi.spyOn(db, 'insert').mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      } as never);

      await expect(
        teachersRepository.create({
          schoolId: mockTeacher.schoolId,
          employeeId: 'FAIL',
          firstName: 'Fail',
          lastName: 'Teacher',
          email: 'fail@example.com',
        }),
      ).rejects.toThrow('Failed to create teacher record');
    });
  });

  describe('update', () => {
    it('updates teacher fields when provided', async () => {
      const updated = { ...mockTeacher, firstName: 'Updated Edna' };
      vi.spyOn(db, 'update').mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updated]),
          }),
        }),
      } as never);

      const result = await teachersRepository.update(mockTeacher.id, {
        employeeId: 'EMP-002',
        firstName: 'Updated Edna',
        lastName: 'Skinner',
        email: 'edna.skinner@springfield.edu',
        phone: '+15550000000',
        userId: 'new-user-id',
        joiningDate: new Date('2025-09-01T00:00:00.000Z'),
        qualification: 'Ph.D.',
        status: 'on_leave',
      });

      expect(result).toEqual(updated);
    });
  });

  describe('softDelete', () => {
    it('soft deletes teacher and returns true on success', async () => {
      vi.spyOn(db, 'update').mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: mockTeacher.id }]),
          }),
        }),
      } as never);

      const result = await teachersRepository.softDelete(mockTeacher.id);
      expect(result).toBe(true);
    });
  });

  describe('listBySchool', () => {
    it('lists teachers for school with all filter and sort branches', async () => {
      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockTeacher]),
            }),
          }),
        }),
      } as never);

      const result = await teachersRepository.listBySchool(
        mockTeacher.schoolId,
        10,
        {
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          id: mockTeacher.id,
        },
        {
          status: 'active',
          search: 'Edna',
          sortBy: 'lastName',
          sortOrder: 'asc',
        },
      );
      expect(result).toHaveLength(1);
    });

    it('applies sortBy firstName, email, employeeId, joiningDate, status branches', async () => {
      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockTeacher]),
            }),
          }),
        }),
      } as never);

      for (const sortBy of [
        'firstName',
        'email',
        'employeeId',
        'joiningDate',
        'status',
        'createdAt',
      ] as const) {
        const result = await teachersRepository.listBySchool(mockTeacher.schoolId, 10, undefined, {
          sortBy,
          sortOrder: 'asc',
        });
        expect(result).toHaveLength(1);
      }
    });
  });
});
