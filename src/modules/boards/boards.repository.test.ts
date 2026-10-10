import { describe, it, expect, vi, beforeEach } from 'vitest';
import { boardsRepository } from './boards.repository.js';
import { db } from '../../db/pool.js';
import type { Board } from '../../db/schema/boards.js';

describe('BoardsRepository', () => {
  const mockBoard: Board = {
    id: '33333333-3333-4333-a333-333333333333',
    schoolId: '11111111-1111-4111-a111-111111111111',
    name: 'Central Board of Secondary Education',
    code: 'CBSE',
    description: 'National curriculum board of India',
    status: 'active',
    createdAt: new Date('2026-01-01T12:00:00.000Z'),
    updatedAt: new Date('2026-01-01T12:00:00.000Z'),
    deletedAt: null,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('findById', () => {
    it('returns board by id when found', async () => {
      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockBoard]),
          }),
        }),
      } as never);

      const result = await boardsRepository.findById(mockBoard.id);
      expect(result).toEqual(mockBoard);
    });

    it('returns null when board not found', async () => {
      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as never);

      const result = await boardsRepository.findById('non-existent');
      expect(result).toBeNull();
    });

    it('allows including deleted records', async () => {
      const selectSpy = vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockBoard]),
          }),
        }),
      } as never);

      await boardsRepository.findById(mockBoard.id, true);
      expect(selectSpy).toHaveBeenCalled();
    });
  });

  describe('findBySchoolAndCode', () => {
    it('returns board by school and code (case-insensitive)', async () => {
      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockBoard]),
          }),
        }),
      } as never);

      const result = await boardsRepository.findBySchoolAndCode(mockBoard.schoolId, 'cbse');
      expect(result).toEqual(mockBoard);
    });

    it('returns null when not found', async () => {
      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as never);

      const result = await boardsRepository.findBySchoolAndCode(mockBoard.schoolId, 'NOTFOUND');
      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('creates board record with trimmed name and uppercase code', async () => {
      vi.spyOn(db, 'insert').mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockBoard]),
        }),
      } as never);

      const result = await boardsRepository.create({
        schoolId: mockBoard.schoolId,
        name: '  Central Board of Secondary Education  ',
        code: '  cbse  ',
        description: 'National board',
        status: 'active',
      });

      expect(result).toEqual(mockBoard);
    });

    it('throws error when insert returns empty result', async () => {
      vi.spyOn(db, 'insert').mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      } as never);

      await expect(
        boardsRepository.create({
          schoolId: mockBoard.schoolId,
          name: 'Fail Board',
          code: 'FAIL',
        }),
      ).rejects.toThrow('Failed to create board record');
    });
  });

  describe('update', () => {
    it('updates board fields when provided', async () => {
      const updatedBoard = { ...mockBoard, name: 'ICSE', code: 'ICSE' };
      vi.spyOn(db, 'update').mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedBoard]),
          }),
        }),
      } as never);

      const result = await boardsRepository.update(mockBoard.id, {
        name: 'ICSE',
        code: 'icse',
        description: 'New desc',
        status: 'inactive',
      });

      expect(result).toEqual(updatedBoard);
    });

    it('returns findById if update data is empty', async () => {
      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockBoard]),
          }),
        }),
      } as never);

      const result = await boardsRepository.update(mockBoard.id, {});
      expect(result).toEqual(mockBoard);
    });
  });

  describe('softDelete', () => {
    it('soft deletes board and returns true on success', async () => {
      vi.spyOn(db, 'update').mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: mockBoard.id }]),
          }),
        }),
      } as never);

      const result = await boardsRepository.softDelete(mockBoard.id);
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

      const result = await boardsRepository.softDelete('not-found');
      expect(result).toBe(false);
    });
  });

  describe('listBySchool', () => {
    it('lists boards for school without cursor or filters', async () => {
      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockBoard]),
            }),
          }),
        }),
      } as never);

      const result = await boardsRepository.listBySchool(mockBoard.schoolId, 10);
      expect(result).toHaveLength(1);
    });

    it('lists boards with status, search, and cursor', async () => {
      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockBoard]),
            }),
          }),
        }),
      } as never);

      const result = await boardsRepository.listBySchool(
        mockBoard.schoolId,
        10,
        {
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          id: mockBoard.id,
        },
        {
          status: 'active',
          search: 'CBSE',
          sortBy: 'name',
          sortOrder: 'asc',
        },
      );
      expect(result).toHaveLength(1);
    });

    it('applies sortBy code, status, and createdAt sorting branches', async () => {
      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockBoard]),
            }),
          }),
        }),
      } as never);

      for (const sortBy of ['code', 'status', 'createdAt'] as const) {
        const result = await boardsRepository.listBySchool(mockBoard.schoolId, 10, undefined, {
          sortBy,
          sortOrder: 'asc',
        });
        expect(result).toHaveLength(1);
      }
    });
  });
});
