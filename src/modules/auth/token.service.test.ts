import { describe, it, expect, vi, beforeEach } from 'vitest';
import { tokenService } from './token.service.js';
import { db } from '../../db/pool.js';
import { usersRepository } from '../users/users.repository.js';
import { UnauthorizedError } from '../../lib/app-error.js';

describe('TokenService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('hashToken', () => {
    it('deterministically hashes tokens with SHA-256', () => {
      const hash1 = tokenService.hashToken('test-token-123');
      const hash2 = tokenService.hashToken('test-token-123');
      const hash3 = tokenService.hashToken('different-token');

      expect(hash1).toBe(hash2);
      expect(hash1).not.toBe(hash3);
      expect(hash1).toHaveLength(64); // SHA-256 hex length
    });
  });

  describe('generateTokens', () => {
    it('creates access JWT and stores hashed refresh token in database', async () => {
      const insertSpy = vi.spyOn(db, 'insert').mockReturnValue({
        values: vi.fn().mockResolvedValue({ rowCount: 1 }),
      } as never);

      const tokens = await tokenService.generateTokens(
        { id: 'user-123', role: 'user' },
        'family-abc',
        'Mozilla/5.0',
        '127.0.0.1',
      );

      expect(tokens.accessToken).toBeDefined();
      expect(typeof tokens.accessToken).toBe('string');
      expect(tokens.refreshToken).toBeDefined();
      expect(tokens.refreshToken).toHaveLength(80); // 40 bytes hex

      expect(insertSpy).toHaveBeenCalled();
    });
  });

  describe('rotateRefreshToken', () => {
    it('successfully rotates valid refresh token', async () => {
      const tokenHash = tokenService.hashToken('valid-refresh-token');
      const mockRecord = {
        id: 'token-row-1',
        tokenHash,
        familyId: 'family-1',
        userId: 'user-123',
        expiresAt: new Date(Date.now() + 100000),
        revokedAt: null,
      };

      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockRecord]),
          }),
        }),
      } as never);

      vi.spyOn(usersRepository, 'findById').mockResolvedValue({
        id: 'user-123',
        email: 'user@example.com',
        role: 'user',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      });

      const updateSpy = vi.spyOn(db, 'update').mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue({ rowCount: 1 }),
        }),
      } as never);

      vi.spyOn(db, 'insert').mockReturnValue({
        values: vi.fn().mockResolvedValue({ rowCount: 1 }),
      } as never);

      const newTokens = await tokenService.rotateRefreshToken('valid-refresh-token');
      expect(newTokens.accessToken).toBeDefined();
      expect(newTokens.refreshToken).toBeDefined();
      expect(updateSpy).toHaveBeenCalled();
    });

    it('throws UnauthorizedError if refresh token does not exist', async () => {
      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as never);

      await expect(tokenService.rotateRefreshToken('non-existent')).rejects.toThrow(
        UnauthorizedError,
      );
    });

    it('detects reuse attack when token is already revoked and revokes entire family', async () => {
      const mockRevokedRecord = {
        id: 'token-row-2',
        tokenHash: tokenService.hashToken('reused-token'),
        familyId: 'compromised-family',
        userId: 'user-123',
        expiresAt: new Date(Date.now() + 100000),
        revokedAt: new Date(),
      };

      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockRevokedRecord]),
          }),
        }),
      } as never);

      const updateSpy = vi.spyOn(db, 'update').mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue({ rowCount: 5 }),
        }),
      } as never);

      await expect(tokenService.rotateRefreshToken('reused-token')).rejects.toThrow(
        'Refresh token reuse detected. All sessions revoked.',
      );

      expect(updateSpy).toHaveBeenCalled();
    });

    it('throws UnauthorizedError when token is expired', async () => {
      const mockExpiredRecord = {
        id: 'token-row-3',
        tokenHash: tokenService.hashToken('expired-token'),
        familyId: 'family-2',
        userId: 'user-123',
        expiresAt: new Date(Date.now() - 10000), // expired
        revokedAt: null,
      };

      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockExpiredRecord]),
          }),
        }),
      } as never);

      await expect(tokenService.rotateRefreshToken('expired-token')).rejects.toThrow(
        'Refresh token has expired',
      );
    });

    it('throws UnauthorizedError when user is inactive or deleted', async () => {
      const mockRecord = {
        id: 'token-row-4',
        tokenHash: tokenService.hashToken('valid-token-inactive-user'),
        familyId: 'family-3',
        userId: 'user-inactive',
        expiresAt: new Date(Date.now() + 100000),
        revokedAt: null,
      };

      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockRecord]),
          }),
        }),
      } as never);

      vi.spyOn(usersRepository, 'findById').mockResolvedValue({
        id: 'user-inactive',
        email: 'inactive@example.com',
        role: 'user',
        isActive: false, // inactive!
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      });

      await expect(tokenService.rotateRefreshToken('valid-token-inactive-user')).rejects.toThrow(
        'User account is inactive or deleted',
      );
    });
  });

  describe('revokeToken & revokeAllUserTokens', () => {
    it('revokes a single token by hash', async () => {
      const updateSpy = vi.spyOn(db, 'update').mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue({ rowCount: 1 }),
        }),
      } as never);

      await tokenService.revokeToken('logout-token');
      expect(updateSpy).toHaveBeenCalled();
    });

    it('revokes all tokens for a user', async () => {
      const updateSpy = vi.spyOn(db, 'update').mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue({ rowCount: 3 }),
        }),
      } as never);

      await tokenService.revokeAllUserTokens('user-123');
      expect(updateSpy).toHaveBeenCalled();
    });
  });
});
