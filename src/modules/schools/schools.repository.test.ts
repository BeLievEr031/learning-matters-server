import { describe, it, expect, vi, beforeEach } from 'vitest';
import { schoolsRepository } from './schools.repository.js';
import { db } from '../../db/pool.js';
import type { School } from '../../db/schema/schools.js';

describe('SchoolsRepository', () => {
  const mockSchool: School = {
    id: '11111111-1111-4111-a111-111111111111',
    name: 'ABC International School',
    code: 'ABC001',
    address: '42 Knowledge Way',
    city: 'New Delhi',
    state: 'Delhi',
    country: 'India',
    phone: '+919876543210',
    email: 'contact@abcschool.edu',
    website: 'https://abcschool.edu',
    logoUrl: 'https://abcschool.edu/logo.png',
    status: 'active',
    createdAt: new Date('2026-01-01T12:00:00.000Z'),
    updatedAt: new Date('2026-01-01T12:00:00.000Z'),
    deletedAt: null,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('findById', () => {
    it('returns school by id when found', async () => {
      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockSchool]),
          }),
        }),
      } as never);

      const result = await schoolsRepository.findById(mockSchool.id);
      expect(result).toEqual(mockSchool);
    });

    it('returns null when school not found', async () => {
      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as never);

      const result = await schoolsRepository.findById('non-existent');
      expect(result).toBeNull();
    });

    it('allows including deleted records', async () => {
      const selectSpy = vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockSchool]),
          }),
        }),
      } as never);

      await schoolsRepository.findById(mockSchool.id, true);
      expect(selectSpy).toHaveBeenCalled();
    });
  });

  describe('findByCode', () => {
    it('returns school by case-insensitive code', async () => {
      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockSchool]),
          }),
        }),
      } as never);

      const result = await schoolsRepository.findByCode('abc001');
      expect(result).toEqual(mockSchool);
    });

    it('returns null when code not found', async () => {
      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as never);

      const result = await schoolsRepository.findByCode('NOTFOUND');
      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('creates and returns school with trimmed and uppercased code', async () => {
      vi.spyOn(db, 'insert').mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockSchool]),
        }),
      } as never);

      const result = await schoolsRepository.create({
        name: '  ABC International School  ',
        code: '  abc001  ',
        address: '42 Knowledge Way',
        city: 'New Delhi',
        state: 'Delhi',
        country: 'India',
        phone: '+919876543210',
        email: 'CONTACT@ABCSCHOOL.EDU',
        website: 'https://abcschool.edu',
        logoUrl: 'https://abcschool.edu/logo.png',
        status: 'active',
      });

      expect(result).toEqual(mockSchool);
    });

    it('throws error when insert returns empty result', async () => {
      vi.spyOn(db, 'insert').mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      } as never);

      await expect(
        schoolsRepository.create({
          name: 'Fail School',
          code: 'FAIL',
        }),
      ).rejects.toThrow('Failed to create school record');
    });
  });

  describe('update', () => {
    it('updates school fields when provided', async () => {
      const updatedSchool = { ...mockSchool, name: 'Updated School' };
      vi.spyOn(db, 'update').mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedSchool]),
          }),
        }),
      } as never);

      const result = await schoolsRepository.update(mockSchool.id, {
        name: 'Updated School',
        code: 'ABC002',
        address: 'New Address',
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
        phone: '+919800000000',
        email: 'new@abcschool.edu',
        website: 'https://new.edu',
        logoUrl: 'https://new.edu/logo.png',
        status: 'inactive',
      });

      expect(result).toEqual(updatedSchool);
    });

    it('returns findById if update data is empty', async () => {
      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockSchool]),
          }),
        }),
      } as never);

      const result = await schoolsRepository.update(mockSchool.id, {});
      expect(result).toEqual(mockSchool);
    });

    it('returns null if school was not found or already deleted', async () => {
      vi.spyOn(db, 'update').mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as never);

      const result = await schoolsRepository.update('not-found', { name: 'New Name' });
      expect(result).toBeNull();
    });
  });

  describe('softDelete', () => {
    it('soft deletes school and returns true on success', async () => {
      vi.spyOn(db, 'update').mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: mockSchool.id }]),
          }),
        }),
      } as never);

      const result = await schoolsRepository.softDelete(mockSchool.id);
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

      const result = await schoolsRepository.softDelete('not-found');
      expect(result).toBe(false);
    });
  });

  describe('list', () => {
    it('lists schools without cursor or filters', async () => {
      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockSchool]),
            }),
          }),
        }),
      } as never);

      const result = await schoolsRepository.list(10);
      expect(result).toHaveLength(1);
    });

    it('lists schools with status, search, and cursor filters', async () => {
      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockSchool]),
            }),
          }),
        }),
      } as never);

      const result = await schoolsRepository.list(
        10,
        {
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          id: mockSchool.id,
        },
        {
          status: 'active',
          search: 'ABC',
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
              limit: vi.fn().mockResolvedValue([mockSchool]),
            }),
          }),
        }),
      } as never);

      for (const sortBy of ['code', 'status', 'createdAt'] as const) {
        const result = await schoolsRepository.list(10, undefined, {
          sortBy,
          sortOrder: 'asc',
        });
        expect(result).toHaveLength(1);
      }
    });
  });
});
