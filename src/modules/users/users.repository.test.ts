import { describe, it, expect, vi, beforeEach } from 'vitest';
import { usersRepository } from './users.repository.js';
import { db } from '../../db/pool.js';

describe('UsersRepository', () => {
  const mockUserSafe = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    role: 'student' as const,
    schoolId: null,
    firstName: null,
    lastName: null,
    phone: null,
    status: 'active',
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    deletedAt: null,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('findById', () => {
    it('returns user when found without deleted records', async () => {
      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockUserSafe]),
          }),
        }),
      } as never);

      const user = await usersRepository.findById(mockUserSafe.id);
      expect(user).toEqual(mockUserSafe);
    });

    it('returns null when user not found', async () => {
      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as never);

      const user = await usersRepository.findById('non-existent');
      expect(user).toBeNull();
    });

    it('allows including deleted records', async () => {
      const selectSpy = vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockUserSafe]),
          }),
        }),
      } as never);

      await usersRepository.findById(mockUserSafe.id, true);
      expect(selectSpy).toHaveBeenCalled();
    });
  });

  describe('findByEmail', () => {
    it('returns user by lowercased email', async () => {
      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockUserSafe]),
          }),
        }),
      } as never);

      const user = await usersRepository.findByEmail('TEST@EXAMPLE.COM');
      expect(user).toEqual(mockUserSafe);
    });

    it('returns null if email not found', async () => {
      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as never);

      const user = await usersRepository.findByEmail('none@example.com');
      expect(user).toBeNull();
    });
  });

  describe('findForAuthByEmail', () => {
    it('returns full user record with passwordHash', async () => {
      const authUser = {
        ...mockUserSafe,
        passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$dummyhash',
      };

      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([authUser]),
          }),
        }),
      } as never);

      const user = await usersRepository.findForAuthByEmail('test@example.com');
      expect(user).toEqual(authUser);
      expect(user?.passwordHash).toBeDefined();
    });
  });

  describe('create', () => {
    it('creates user and returns safe representation', async () => {
      vi.spyOn(db, 'insert').mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockUserSafe]),
        }),
      } as never);

      const created = await usersRepository.create({
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        role: 'student',
      });

      expect(created).toEqual(mockUserSafe);
    });

    it('throws error if insert fails to return record', async () => {
      vi.spyOn(db, 'insert').mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      } as never);

      await expect(
        usersRepository.create({
          email: 'test@example.com',
          passwordHash: 'hashed-password',
        }),
      ).rejects.toThrow('Failed to create user record');
    });
  });

  describe('update', () => {
    it('updates user fields when provided', async () => {
      const updatedUser = { ...mockUserSafe, role: 'admin' as const };

      vi.spyOn(db, 'update').mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedUser]),
          }),
        }),
      } as never);

      const res = await usersRepository.update(mockUserSafe.id, {
        email: 'updated@example.com',
        role: 'admin',
        isActive: false,
      });

      expect(res).toEqual(updatedUser);
    });

    it('returns findById if update data is empty', async () => {
      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockUserSafe]),
          }),
        }),
      } as never);

      const res = await usersRepository.update(mockUserSafe.id, {});
      expect(res).toEqual(mockUserSafe);
    });
  });

  describe('softDelete', () => {
    it('soft deletes user and returns true if record was updated', async () => {
      vi.spyOn(db, 'update').mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: mockUserSafe.id }]),
          }),
        }),
      } as never);

      const deleted = await usersRepository.softDelete(mockUserSafe.id);
      expect(deleted).toBe(true);
    });

    it('returns false if record was not found or already deleted', async () => {
      vi.spyOn(db, 'update').mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as never);

      const deleted = await usersRepository.softDelete('not-found');
      expect(deleted).toBe(false);
    });
  });

  describe('list', () => {
    it('lists users without cursor', async () => {
      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockUserSafe]),
            }),
          }),
        }),
      } as never);

      const result = await usersRepository.list(10);
      expect(result).toHaveLength(1);
    });

    it('lists users with cursor', async () => {
      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockUserSafe]),
            }),
          }),
        }),
      } as never);

      const result = await usersRepository.list(10, {
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        id: mockUserSafe.id,
      });

      expect(result).toHaveLength(1);
    });
  });
});
