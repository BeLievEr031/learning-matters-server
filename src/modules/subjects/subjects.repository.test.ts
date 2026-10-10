import { describe, it, expect, vi, beforeEach } from 'vitest';
import { subjectsRepository, type GradeSubjectItem } from './subjects.repository.js';
import { db } from '../../db/pool.js';
import type { Subject, GradeSubject } from '../../db/schema/subjects.js';

describe('SubjectsRepository', () => {
  const mockSubject: Subject = {
    id: '55555555-5555-4555-a555-555555555555',
    schoolId: '11111111-1111-4111-a111-111111111111',
    name: 'Mathematics',
    code: 'MATH',
    description: 'Core mathematics',
    status: 'active',
    createdAt: new Date('2026-01-01T12:00:00.000Z'),
    updatedAt: new Date('2026-01-01T12:00:00.000Z'),
    deletedAt: null,
  };

  const mockGradeSubject: GradeSubject = {
    id: '66666666-6666-4666-a666-666666666666',
    schoolId: '11111111-1111-4111-a111-111111111111',
    gradeId: '44444444-4444-4444-a444-444444444444',
    subjectId: '55555555-5555-4555-a555-555555555555',
    status: 'active',
    createdAt: new Date('2026-01-01T12:00:00.000Z'),
    updatedAt: new Date('2026-01-01T12:00:00.000Z'),
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('findById', () => {
    it('returns subject by id when found', async () => {
      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockSubject]),
          }),
        }),
      } as never);

      const result = await subjectsRepository.findById(mockSubject.id);
      expect(result).toEqual(mockSubject);
    });

    it('returns null when not found', async () => {
      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as never);

      const result = await subjectsRepository.findById('non-existent');
      expect(result).toBeNull();
    });

    it('allows including deleted records', async () => {
      const selectSpy = vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockSubject]),
          }),
        }),
      } as never);

      await subjectsRepository.findById(mockSubject.id, true);
      expect(selectSpy).toHaveBeenCalled();
    });
  });

  describe('findBySchoolAndCode', () => {
    it('returns subject by school and code (case-insensitive)', async () => {
      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockSubject]),
          }),
        }),
      } as never);

      const result = await subjectsRepository.findBySchoolAndCode(mockSubject.schoolId, 'math');
      expect(result).toEqual(mockSubject);
    });

    it('returns null when not found', async () => {
      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as never);

      const result = await subjectsRepository.findBySchoolAndCode(mockSubject.schoolId, 'NONE');
      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('creates and returns subject record', async () => {
      vi.spyOn(db, 'insert').mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockSubject]),
        }),
      } as never);

      const result = await subjectsRepository.create({
        schoolId: mockSubject.schoolId,
        name: 'Mathematics',
        code: 'math',
        description: 'Core mathematics',
        status: 'active',
      });

      expect(result).toEqual(mockSubject);
    });

    it('throws error when insert returns empty result', async () => {
      vi.spyOn(db, 'insert').mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      } as never);

      await expect(
        subjectsRepository.create({
          schoolId: mockSubject.schoolId,
          name: 'Fail Subject',
          code: 'FAIL',
        }),
      ).rejects.toThrow('Failed to create subject record');
    });
  });

  describe('update', () => {
    it('updates subject fields when provided', async () => {
      const updated = { ...mockSubject, name: 'Advanced Math' };
      vi.spyOn(db, 'update').mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updated]),
          }),
        }),
      } as never);

      const result = await subjectsRepository.update(mockSubject.id, {
        name: 'Advanced Math',
        code: 'MATH-ADV',
        description: 'Advanced curriculum',
        status: 'inactive',
      });

      expect(result).toEqual(updated);
    });

    it('returns findById if update data is empty', async () => {
      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockSubject]),
          }),
        }),
      } as never);

      const result = await subjectsRepository.update(mockSubject.id, {});
      expect(result).toEqual(mockSubject);
    });
  });

  describe('softDelete', () => {
    it('soft deletes subject and returns true on success', async () => {
      vi.spyOn(db, 'update').mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: mockSubject.id }]),
          }),
        }),
      } as never);

      const result = await subjectsRepository.softDelete(mockSubject.id);
      expect(result).toBe(true);
    });

    it('returns false when record not found or already deleted', async () => {
      vi.spyOn(db, 'update').mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as never);

      const result = await subjectsRepository.softDelete('not-found');
      expect(result).toBe(false);
    });
  });

  describe('grade-subject associations', () => {
    it('finds grade-subject by gradeId and subjectId', async () => {
      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockGradeSubject]),
          }),
        }),
      } as never);

      const result = await subjectsRepository.findGradeSubject(
        mockGradeSubject.gradeId,
        mockGradeSubject.subjectId,
      );
      expect(result).toEqual(mockGradeSubject);
    });

    it('assigns subject to grade', async () => {
      vi.spyOn(db, 'insert').mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockGradeSubject]),
        }),
      } as never);

      const result = await subjectsRepository.assignToGrade(
        mockGradeSubject.schoolId,
        mockGradeSubject.gradeId,
        mockGradeSubject.subjectId,
      );
      expect(result).toEqual(mockGradeSubject);
    });

    it('throws error if assignToGrade returns empty', async () => {
      vi.spyOn(db, 'insert').mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      } as never);

      await expect(
        subjectsRepository.assignToGrade(
          mockGradeSubject.schoolId,
          mockGradeSubject.gradeId,
          mockGradeSubject.subjectId,
        ),
      ).rejects.toThrow('Failed to assign subject to grade');
    });

    it('removes grade assignment and returns true', async () => {
      vi.spyOn(db, 'delete').mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: mockGradeSubject.id }]),
        }),
      } as never);

      const result = await subjectsRepository.removeGradeAssignment(
        mockGradeSubject.gradeId,
        mockGradeSubject.subjectId,
      );
      expect(result).toBe(true);
    });

    it('cascades removal of grade assignments and returns count', async () => {
      vi.spyOn(db, 'delete').mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: '1' }, { id: '2' }]),
        }),
      } as never);

      const result = await subjectsRepository.cascadeRemoveGradeAssignments(mockSubject.id);
      expect(result).toBe(2);
    });
  });

  describe('listSubjectsByGrade', () => {
    const mockItem: GradeSubjectItem = {
      ...mockSubject,
      gradeSubjectId: mockGradeSubject.id,
      gradeSubjectStatus: 'active',
    };

    it('lists subjects for grade with filters and sorting', async () => {
      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([mockItem]),
              }),
            }),
          }),
        }),
      } as never);

      const result = await subjectsRepository.listSubjectsByGrade(
        mockGradeSubject.gradeId,
        10,
        {
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          id: mockGradeSubject.id,
        },
        {
          status: 'active',
          search: 'MATH',
          sortBy: 'code',
          sortOrder: 'asc',
        },
      );
      expect(result).toHaveLength(1);
    });

    it('applies sortBy name, status, and createdAt sorting branches', async () => {
      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([mockItem]),
              }),
            }),
          }),
        }),
      } as never);

      for (const sortBy of ['name', 'status', 'createdAt'] as const) {
        const result = await subjectsRepository.listSubjectsByGrade(
          mockGradeSubject.gradeId,
          10,
          undefined,
          {
            sortBy,
            sortOrder: 'asc',
          },
        );
        expect(result).toHaveLength(1);
      }
    });
  });

  describe('hasActiveGradeSubjects', () => {
    it('returns true if active grade assignments exist', async () => {
      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: '1' }]),
          }),
        }),
      } as never);

      const result = await subjectsRepository.hasActiveGradeSubjects(mockSubject.id);
      expect(result).toBe(true);
    });

    it('returns false if no active grade assignments exist', async () => {
      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as never);

      const result = await subjectsRepository.hasActiveGradeSubjects(mockSubject.id);
      expect(result).toBe(false);
    });
  });
});
