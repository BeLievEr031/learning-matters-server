import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { createApp } from '../../app.js';
import { env } from '../../config/env.js';
import { usersRepository, type UserSafe } from '../users/users.repository.js';
import type { User } from '../../db/schema/users.js';
import { tokenService } from './token.service.js';
import { db } from '../../db/pool.js';
import type { ErrorResponsePayload } from '../../middleware/error-handler.js';

describe('Auth Module & Security', () => {
  const sampleUserSafe: UserSafe = {
    id: '33333333-3333-4333-a333-333333333333',
    email: 'user@learning-matters.com',
    role: 'user',
    isActive: true,
    createdAt: new Date('2026-01-01T12:00:00Z'),
    updatedAt: new Date('2026-01-01T12:00:00Z'),
    deletedAt: null,
  };

  const sampleAdminSafe: UserSafe = {
    id: '44444444-4444-4444-a444-444444444444',
    email: 'admin@learning-matters.com',
    role: 'admin',
    isActive: true,
    createdAt: new Date('2026-01-01T12:00:00Z'),
    updatedAt: new Date('2026-01-01T12:00:00Z'),
    deletedAt: null,
  };

  const mockTokens = {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /api/v1/auth/register', () => {
    it('rejects passwords shorter than 12 characters with 400 validation error', async () => {
      const app = createApp();
      const res = await request(app).post('/api/v1/auth/register').send({
        email: 'newuser@learning-matters.com',
        password: 'Short1!',
      });

      expect(res.status).toBe(400);
      const body = res.body as ErrorResponsePayload;
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects passwords without required character classes (uppercase, lowercase, number)', async () => {
      const app = createApp();
      const res = await request(app).post('/api/v1/auth/register').send({
        email: 'newuser@learning-matters.com',
        password: 'alllowercaselettershere',
      });

      expect(res.status).toBe(400);
      const body = res.body as ErrorResponsePayload;
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('registers user and returns tokens without exposing password_hash', async () => {
      const app = createApp();
      vi.spyOn(usersRepository, 'findByEmail').mockResolvedValue(null);
      vi.spyOn(usersRepository, 'create').mockResolvedValue(sampleUserSafe);
      vi.spyOn(tokenService, 'generateTokens').mockResolvedValue(mockTokens);

      const res = await request(app).post('/api/v1/auth/register').send({
        email: 'newuser@learning-matters.com',
        password: 'ValidPassword123!',
      });

      expect(res.status).toBe(201);
      const body = res.body as { user: UserSafe; tokens: typeof mockTokens };
      expect(body.user.email).toBe('user@learning-matters.com');
      expect(body.tokens.accessToken).toBe('mock-access-token');
      expect(body.tokens.refreshToken).toBe('mock-refresh-token');
      expect((body.user as Record<string, unknown>).passwordHash).toBeUndefined();
      expect((body.user as Record<string, unknown>).password_hash).toBeUndefined();
    });

    it('returns 409 when user already exists', async () => {
      const app = createApp();
      vi.spyOn(usersRepository, 'findByEmail').mockResolvedValue(sampleUserSafe);

      const res = await request(app).post('/api/v1/auth/register').send({
        email: 'user@learning-matters.com',
        password: 'ValidPassword123!',
      });

      expect(res.status).toBe(409);
      const body = res.body as ErrorResponsePayload;
      expect(body.error.code).toBe('CONFLICT');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('authenticates valid credentials and returns 200 with tokens', async () => {
      const app = createApp();
      const validHash = await argon2.hash('ValidPassword123!');
      const userWithPassword: User = {
        ...sampleUserSafe,
        passwordHash: validHash,
      };

      vi.spyOn(usersRepository, 'findForAuthByEmail').mockResolvedValue(userWithPassword);
      vi.spyOn(tokenService, 'generateTokens').mockResolvedValue(mockTokens);

      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'user@learning-matters.com',
        password: 'ValidPassword123!',
      });

      expect(res.status).toBe(200);
      const body = res.body as { user: UserSafe; tokens: typeof mockTokens };
      expect(body.user.id).toBe(sampleUserSafe.id);
      expect(body.tokens.accessToken).toBe(mockTokens.accessToken);
    });

    it('returns identical generic error for unknown email and wrong password to prevent enumeration', async () => {
      const app = createApp();
      const validHash = await argon2.hash('ValidPassword123!');
      const userWithPassword: User = {
        ...sampleUserSafe,
        passwordHash: validHash,
      };

      // Case 1: Wrong password for existing user
      vi.spyOn(usersRepository, 'findForAuthByEmail').mockResolvedValue(userWithPassword);
      const resWrongPassword = await request(app).post('/api/v1/auth/login').send({
        email: 'user@learning-matters.com',
        password: 'WrongPassword999!',
      });

      // Case 2: Unknown email
      vi.spyOn(usersRepository, 'findForAuthByEmail').mockResolvedValue(null);
      const resUnknownEmail = await request(app).post('/api/v1/auth/login').send({
        email: 'unknown@learning-matters.com',
        password: 'WrongPassword999!',
      });

      expect(resWrongPassword.status).toBe(401);
      expect(resUnknownEmail.status).toBe(401);

      const bodyWrongPassword = resWrongPassword.body as ErrorResponsePayload;
      const bodyUnknownEmail = resUnknownEmail.body as ErrorResponsePayload;

      expect(bodyWrongPassword.error.message).toBe('Invalid email or password');
      expect(bodyUnknownEmail.error.message).toBe('Invalid email or password');
      expect(bodyWrongPassword.error.code).toBe(bodyUnknownEmail.error.code);
    });

    it('rejects inactive or soft-deleted accounts with 401', async () => {
      const app = createApp();
      const validHash = await argon2.hash('ValidPassword123!');
      const inactiveUser: User = {
        ...sampleUserSafe,
        isActive: false,
        passwordHash: validHash,
      };

      vi.spyOn(usersRepository, 'findForAuthByEmail').mockResolvedValue(inactiveUser);

      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'user@learning-matters.com',
        password: 'ValidPassword123!',
      });

      expect(res.status).toBe(401);
      const body = res.body as ErrorResponsePayload;
      expect(body.error.message).toBe('Account is disabled');
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('rotates refresh token and returns new token pair', async () => {
      const app = createApp();
      const newTokens = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };
      vi.spyOn(tokenService, 'rotateRefreshToken').mockResolvedValue(newTokens);

      const res = await request(app).post('/api/v1/auth/refresh').send({
        refreshToken: 'valid-refresh-token',
      });

      expect(res.status).toBe(200);
      const body = res.body as { tokens: typeof newTokens };
      expect(body.tokens.accessToken).toBe('new-access-token');
      expect(body.tokens.refreshToken).toBe('new-refresh-token');
    });
  });

  describe('POST /api/v1/auth/logout and logout-all', () => {
    it('revokes single token on logout and returns 204', async () => {
      const app = createApp();
      const revokeSpy = vi.spyOn(tokenService, 'revokeToken').mockResolvedValue();

      const res = await request(app).post('/api/v1/auth/logout').send({
        refreshToken: 'some-refresh-token',
      });

      expect(res.status).toBe(204);
      expect(revokeSpy).toHaveBeenCalledWith('some-refresh-token');
    });

    it('revokes all user tokens on authenticated logout-all and returns 204', async () => {
      const app = createApp();
      const revokeAllSpy = vi.spyOn(tokenService, 'revokeAllUserTokens').mockResolvedValue();
      const userToken = jwt.sign(
        { sub: sampleUserSafe.id, role: 'user', jti: 'jti-1' },
        env.JWT_ACCESS_SECRET,
      );

      const res = await request(app)
        .post('/api/v1/auth/logout-all')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(204);
      expect(revokeAllSpy).toHaveBeenCalledWith(sampleUserSafe.id);
    });

    it('rejects unauthenticated logout-all with 401', async () => {
      const app = createApp();
      const res = await request(app).post('/api/v1/auth/logout-all');
      expect(res.status).toBe(401);
    });
  });

  describe('RBAC and Route Protection', () => {
    it('allows admin to access admin-only routes (GET /api/v1/users)', async () => {
      const app = createApp();
      vi.spyOn(usersRepository, 'list').mockResolvedValue([sampleUserSafe]);

      const adminToken = jwt.sign(
        { sub: sampleAdminSafe.id, role: 'admin', jti: 'admin-jti' },
        env.JWT_ACCESS_SECRET,
      );

      const res = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });

    it('rejects regular user from admin-only routes (GET /api/v1/users) with 403 Forbidden', async () => {
      const app = createApp();
      const userToken = jwt.sign(
        { sub: sampleUserSafe.id, role: 'user', jti: 'user-jti' },
        env.JWT_ACCESS_SECRET,
      );

      const res = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);
      const body = res.body as ErrorResponsePayload;
      expect(body.error.code).toBe('FORBIDDEN');
    });

    it('rejects requests with invalid or tampered Bearer token with 401 Unauthorized', async () => {
      const app = createApp();
      const res = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', 'Bearer invalid-token-signature');

      expect(res.status).toBe(401);
      const body = res.body as ErrorResponsePayload;
      expect(body.error.code).toBe('UNAUTHORIZED');
    });

    it('rejects regular user from updating another user with 403 Forbidden', async () => {
      const app = createApp();
      const userToken = jwt.sign(
        { sub: sampleUserSafe.id, role: 'user', jti: 'user-jti' },
        env.JWT_ACCESS_SECRET,
      );

      const res = await request(app)
        .patch(`/api/v1/users/${sampleAdminSafe.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ email: 'hacked@learning-matters.com' });

      expect(res.status).toBe(403);
      const body = res.body as ErrorResponsePayload;
      expect(body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('TokenService Reuse Detection', () => {
    it('revokes the entire family and throws UnauthorizedError when a revoked token is reused', async () => {
      const revokedRecord = {
        id: 'token-uuid-1',
        userId: sampleUserSafe.id,
        tokenHash: tokenService.hashToken('reused-token'),
        familyId: 'family-uuid-1',
        expiresAt: new Date(Date.now() + 100000),
        revokedAt: new Date(),
        userAgent: null,
        ip: null,
        createdAt: new Date(),
      };

      // Mock db.select
      const mockLimit = vi.fn().mockResolvedValue([revokedRecord]);
      const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      vi.spyOn(db, 'select').mockReturnValue({ from: mockFrom } as unknown as ReturnType<
        typeof db.select
      >);

      // Mock db.update for revoking entire family
      const mockUpdateWhere = vi.fn().mockResolvedValue({});
      const mockUpdateSet = vi.fn().mockReturnValue({ where: mockUpdateWhere });
      const updateSpy = vi
        .spyOn(db, 'update')
        .mockReturnValue({ set: mockUpdateSet } as unknown as ReturnType<typeof db.update>);

      await expect(tokenService.rotateRefreshToken('reused-token')).rejects.toThrow(
        /Refresh token reuse detected/,
      );

      expect(updateSpy).toHaveBeenCalled();
    });
  });
});
