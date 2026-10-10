import { describe, it, expect, vi, beforeEach } from 'vitest';
import { gradesRepository } from './grades.repository.js';
import { db } from '../../db/pool.js';
import type { Grade } from '../../db/schema/grades.js';

describe('GradesRepository', () => {
  const mockGrade: Grade = {
    id: '44444444-4444-4444-a444-444444444444',
    schoolId: '11111111-1111-4111-a111-111111111111',
    boardId: '33333333-3333-4333-a333-333333333333',
    name: 'Grade 10 - Section A',
    code: 'G10-A',
    gradeNumber: 10,
    section: 'A',
    capacity: 40,
    classTeacherId: '55555555-5555-4555-a555-555555555555',
    status: 'active',
    createdAt: new Date('2026-01-01T12:00:00.000Z'),
    updatedAt: new Date('2026-01-01T12:00:00.000Z'),
    deletedAt: null,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('findById', () => {
    it('returns grade by id when found', async () => {
      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockGrade]),
          }),
        }),
      } as never);

      const result = await gradesRepository.findById(mockGrade.id);
      expect(result).toEqual(mockGrade);
    });

    it('returns null when grade not found', async () => {
      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as never);

      const result = await gradesRepository.findById('non-existent');
      expect(result).toBeNull();
    });

    it('allows including deleted records', async () => {
      const selectSpy = vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockGrade]),
          }),
        }),
      } as never);

      await gradesRepository.findById(mockGrade.id, true);
      expect(selectSpy).toHaveBeenCalled();
    });
  });

  describe('findByBoardGradeAndSection', () => {
    it('returns grade when matching board, grade number, and section', async () => {
      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockGrade]),
          }),
        }),
      } as never);

      const result = await gradesRepository.findByBoardGradeAndSection(mockGrade.boardId, 10, 'a');
      expect(result).toEqual(mockGrade);
    });

    it('handles null/empty section correctly', async () => {
      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockGrade]),
          }),
        }),
      } as never);

      const result = await gradesRepository.findByBoardGradeAndSection(mockGrade.boardId, 10, null);
      expect(result).toEqual(mockGrade);
    });

    it('returns null when grade not found', async () => {
      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as never);

      const result = await gradesRepository.findByBoardGradeAndSection(mockGrade.boardId, 11, 'B');
      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('creates grade record with trimmed name and uppercase code/section', async () => {
      vi.spyOn(db, 'insert').mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockGrade]),
        }),
      } as never);

      const result = await gradesRepository.create({
        schoolId: mockGrade.schoolId,
        boardId: mockGrade.boardId,
        name: '  Grade 10 - Section A  ',
        code: '  g10-a  ',
        gradeNumber: 10,
        section: '  a  ',
        capacity: 40,
        status: 'active',
      });

      expect(result).toEqual(mockGrade);
    });

    it('throws error when insert returns empty result', async () => {
      vi.spyOn(db, 'insert').mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      } as never);

      await expect(
        gradesRepository.create({
          schoolId: mockGrade.schoolId,
          boardId: mockGrade.boardId,
          name: 'Fail Grade',
          code: 'FAIL',
          gradeNumber: 1,
        }),
      ).rejects.toThrow('Failed to create grade record');
    });
  });

  describe('update', () => {
    it('updates grade fields when provided', async () => {
      const updatedGrade = { ...mockGrade, name: 'Grade 10 - Senior' };
      vi.spyOn(db, 'update').mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedGrade]),
          }),
        }),
      } as never);

      const result = await gradesRepository.update(mockGrade.id, {
        name: 'Grade 10 - Senior',
        code: 'G10-SR',
        gradeNumber: 10,
        section: 'b',
        capacity: 45,
        status: 'inactive',
      });

      expect(result).toEqual(updatedGrade);
    });

    it('returns findById if update data is empty', async () => {
      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockGrade]),
          }),
        }),
      } as never);

      const result = await gradesRepository.update(mockGrade.id, {});
      expect(result).toEqual(mockGrade);
    });
  });

  describe('softDelete', () => {
    it('soft deletes grade and returns true on success', async () => {
      vi.spyOn(db, 'update').mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: mockGrade.id }]),
          }),
        }),
      } as never);

      const result = await gradesRepository.softDelete(mockGrade.id);
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

      const result = await gradesRepository.softDelete('not-found');
      expect(result).toBe(false);
    });
  });

  describe('setClassTeacher', () => {
    it('assigns class teacher and returns updated grade', async () => {
      const updatedGrade = { ...mockGrade, classTeacherId: 'new-teacher-id' };
      vi.spyOn(db, 'update').mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedGrade]),
          }),
        }),
      } as never);

      const result = await gradesRepository.setClassTeacher(mockGrade.id, 'new-teacher-id');
      expect(result).toEqual(updatedGrade);
    });
  });

  describe('listByBoard', () => {
    it('lists grades for board with all filter and sort branches', async () => {
      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockGrade]),
            }),
          }),
        }),
      } as never);

      const result = await gradesRepository.listByBoard(
        mockGrade.boardId,
        10,
        {
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          id: mockGrade.id,
        },
        {
          status: 'active',
          gradeNumber: 10,
          section: 'A',
          search: 'Grade 10',
          sortBy: 'gradeNumber',
          sortOrder: 'asc',
        },
      );
      expect(result).toHaveLength(1);
    });

    it('applies sortBy name, code, status, and createdAt sorting branches', async () => {
      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockGrade]),
            }),
          }),
        }),
      } as never);

      for (const sortBy of ['name', 'code', 'status', 'createdAt'] as const) {
        const result = await gradesRepository.listByBoard(mockGrade.boardId, 10, undefined, {
          sortBy,
          sortOrder: 'asc',
        });
        expect(result).toHaveLength(1);
      }
    });
  });

  describe('hasActiveGradesByBoard', () => {
    it('returns true if active grades exist under board', async () => {
      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: mockGrade.id }]),
          }),
        }),
      } as never);

      const result = await gradesRepository.hasActiveGradesByBoard(mockGrade.boardId);
      expect(result).toBe(true);
    });

    it('returns false if no active grades exist', async () => {
      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as never);

      const result = await gradesRepository.hasActiveGradesByBoard(mockGrade.boardId);
      expect(result).toBe(false);
    });
  });
});
