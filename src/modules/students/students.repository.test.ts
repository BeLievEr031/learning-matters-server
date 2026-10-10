import { describe, it, expect, vi, beforeEach } from 'vitest';
import { studentsRepository } from './students.repository.js';
import { db } from '../../db/pool.js';
import type { Student } from '../../db/schema/students.js';

describe('StudentsRepository', () => {
  const mockStudent: Student = {
    id: '77777777-7777-4777-a777-777777777777',
    schoolId: '11111111-1111-4111-a111-111111111111',
    boardId: '33333333-3333-4333-a333-333333333333',
    gradeId: '44444444-4444-4444-a444-444444444444',
    userId: '66666666-6666-4666-a666-666666666666',
    admissionNumber: 'ADM-2026-001',
    firstName: 'Bart',
    lastName: 'Simpson',
    dateOfBirth: new Date('2012-04-01T00:00:00.000Z'),
    gender: 'male',
    email: 'bart@simpson.edu',
    phone: '+15551234567',
    guardianName: 'Homer Simpson',
    guardianPhone: '+15551234567',
    guardianEmail: 'homer@simpson.edu',
    address: '742 Evergreen Terrace',
    status: 'active',
    createdAt: new Date('2026-01-01T12:00:00.000Z'),
    updatedAt: new Date('2026-01-01T12:00:00.000Z'),
    deletedAt: null,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('findById', () => {
    it('returns student by id when found', async () => {
      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockStudent]),
          }),
        }),
      } as never);

      const result = await studentsRepository.findById(mockStudent.id);
      expect(result).toEqual(mockStudent);
    });

    it('returns null when student not found', async () => {
      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as never);

      const result = await studentsRepository.findById('non-existent');
      expect(result).toBeNull();
    });

    it('allows including deleted records', async () => {
      const selectSpy = vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockStudent]),
          }),
        }),
      } as never);

      await studentsRepository.findById(mockStudent.id, true);
      expect(selectSpy).toHaveBeenCalled();
    });
  });

  describe('findBySchoolAndAdmissionNumber', () => {
    it('returns student by school and admissionNumber (case-insensitive)', async () => {
      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockStudent]),
          }),
        }),
      } as never);

      const result = await studentsRepository.findBySchoolAndAdmissionNumber(
        mockStudent.schoolId,
        'adm-2026-001',
      );
      expect(result).toEqual(mockStudent);
    });
  });

  describe('create', () => {
    it('creates and returns student record', async () => {
      vi.spyOn(db, 'insert').mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockStudent]),
        }),
      } as never);

      const result = await studentsRepository.create({
        schoolId: mockStudent.schoolId,
        boardId: mockStudent.boardId,
        gradeId: mockStudent.gradeId,
        admissionNumber: 'ADM-2026-001',
        firstName: 'Bart',
        lastName: 'Simpson',
        dateOfBirth: new Date('2012-04-01T00:00:00.000Z'),
        gender: 'male',
        email: 'BART@SIMPSON.EDU',
        phone: '+15551234567',
        guardianName: 'Homer Simpson',
        guardianPhone: '+15551234567',
        guardianEmail: 'HOMER@SIMPSON.EDU',
        address: '742 Evergreen Terrace',
        status: 'active',
      });

      expect(result).toEqual(mockStudent);
    });

    it('throws error when insert returns empty result', async () => {
      vi.spyOn(db, 'insert').mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      } as never);

      await expect(
        studentsRepository.create({
          schoolId: mockStudent.schoolId,
          boardId: mockStudent.boardId,
          gradeId: mockStudent.gradeId,
          admissionNumber: 'FAIL',
          firstName: 'Fail',
          lastName: 'Student',
        }),
      ).rejects.toThrow('Failed to create student record');
    });
  });

  describe('update', () => {
    it('updates student fields when provided', async () => {
      const updated = { ...mockStudent, firstName: 'Bartholomew' };
      vi.spyOn(db, 'update').mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updated]),
          }),
        }),
      } as never);

      const result = await studentsRepository.update(mockStudent.id, {
        admissionNumber: 'ADM-2026-002',
        firstName: 'Bartholomew',
        lastName: 'Simpson',
        dateOfBirth: new Date('2012-05-01T00:00:00.000Z'),
        gender: 'male',
        email: 'bart.new@simpson.edu',
        phone: '+15559999999',
        guardianName: 'Marge Simpson',
        guardianPhone: '+15559999999',
        guardianEmail: 'marge@simpson.edu',
        address: 'New address',
        userId: 'new-user',
        status: 'inactive',
      });

      expect(result).toEqual(updated);
    });
  });

  describe('transfer', () => {
    it('updates gradeId and boardId on transfer', async () => {
      const transferred = {
        ...mockStudent,
        gradeId: 'new-grade-id',
        boardId: 'new-board-id',
      };
      vi.spyOn(db, 'update').mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([transferred]),
          }),
        }),
      } as never);

      const result = await studentsRepository.transfer(
        mockStudent.id,
        'new-grade-id',
        'new-board-id',
      );
      expect(result).toEqual(transferred);
    });
  });

  describe('softDelete', () => {
    it('soft deletes student and returns true on success', async () => {
      vi.spyOn(db, 'update').mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: mockStudent.id }]),
          }),
        }),
      } as never);

      const result = await studentsRepository.softDelete(mockStudent.id);
      expect(result).toBe(true);
    });
  });

  describe('listByGrade', () => {
    it('lists students in grade with filters and sorting', async () => {
      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockStudent]),
            }),
          }),
        }),
      } as never);

      const result = await studentsRepository.listByGrade(
        mockStudent.gradeId,
        10,
        {
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          id: mockStudent.id,
        },
        {
          status: 'active',
          gender: 'male',
          search: 'Bart',
          sortBy: 'firstName',
          sortOrder: 'asc',
        },
      );
      expect(result).toHaveLength(1);
    });

    it('applies sortBy lastName, admissionNumber, status, createdAt branches', async () => {
      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockStudent]),
            }),
          }),
        }),
      } as never);

      for (const sortBy of ['lastName', 'admissionNumber', 'status', 'createdAt'] as const) {
        const result = await studentsRepository.listByGrade(mockStudent.gradeId, 10, undefined, {
          sortBy,
          sortOrder: 'asc',
        });
        expect(result).toHaveLength(1);
      }
    });
  });

  describe('hasActiveStudentsByGrade', () => {
    it('returns true if active students exist in grade', async () => {
      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: mockStudent.id }]),
          }),
        }),
      } as never);

      const result = await studentsRepository.hasActiveStudentsByGrade(mockStudent.gradeId);
      expect(result).toBe(true);
    });

    it('returns false if no active students exist in grade', async () => {
      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as never);

      const result = await studentsRepository.hasActiveStudentsByGrade(mockStudent.gradeId);
      expect(result).toBe(false);
    });
  });
});
