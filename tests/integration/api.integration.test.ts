import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { createApp } from '../../src/app.js';
import { env } from '../../src/config/env.js';
import { pool } from '../../src/db/pool.js';
import { usersRepository, type UserSafe } from '../../src/modules/users/users.repository.js';
import { tokenService } from '../../src/modules/auth/token.service.js';
import * as redisModule from '../../src/lib/redis.js';
import { UnauthorizedError } from '../../src/lib/app-error.js';
import type { ErrorResponsePayload } from '../../src/middleware/error-handler.js';
import type { User } from '../../src/db/schema/users.js';

describe('Integration Test Suite', () => {
  const app = createApp();

  const mockAdmin: UserSafe = {
    id: '00000000-0000-4000-a000-000000000001',
    email: 'admin@learning-matters.com',
    role: 'admin',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockUser: UserSafe = {
    id: '00000000-0000-4000-a000-000000000002',
    email: 'student@learning-matters.com',
    role: 'user',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const adminToken = jwt.sign(
    { sub: mockAdmin.id, role: 'admin', jti: 'admin-jti' },
    env.JWT_ACCESS_SECRET,
  );

  const userToken = jwt.sign(
    { sub: mockUser.id, role: 'user', jti: 'user-jti' },
    env.JWT_ACCESS_SECRET,
  );

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Health and Readiness Checks', () => {
    it('GET /health returns 200 with liveness data', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect((res.body as { status: string }).status).toBe('ok');
    });

    it('GET /ready returns 200 when DB and Redis are responsive', async () => {
      vi.spyOn(pool, 'query').mockResolvedValue({
        rows: [{ '?column?': 1 }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      } as never);
      vi.spyOn(redisModule, 'checkRedisHealth').mockResolvedValue(true);

      const res = await request(app).get('/ready');
      expect(res.status).toBe(200);
      expect((res.body as { status: string }).status).toBe('ready');
    });
  });

  describe('Full Authentication Flow', () => {
    it('executes register -> login -> refresh -> logout successfully', async () => {
      // 1. Register
      vi.spyOn(usersRepository, 'findByEmail').mockResolvedValue(null);
      vi.spyOn(usersRepository, 'create').mockResolvedValue(mockUser);
      vi.spyOn(tokenService, 'generateTokens').mockResolvedValue({
        accessToken: 'initial-access-token',
        refreshToken: 'initial-refresh-token',
      });

      const regRes = await request(app).post('/api/v1/auth/register').send({
        email: 'student@learning-matters.com',
        password: 'ValidPassword123!',
      });

      expect(regRes.status).toBe(201);
      const regBody = regRes.body as { tokens: { accessToken: string; refreshToken: string } };
      expect(regBody.tokens.accessToken).toBe('initial-access-token');

      // 2. Login
      const validHash = await argon2.hash('ValidPassword123!');
      const userWithPassword: User = {
        ...mockUser,
        passwordHash: validHash,
      };
      vi.spyOn(usersRepository, 'findForAuthByEmail').mockResolvedValue(userWithPassword);
      vi.spyOn(tokenService, 'generateTokens').mockResolvedValue({
        accessToken: 'login-access-token',
        refreshToken: 'login-refresh-token',
      });

      const loginRes = await request(app).post('/api/v1/auth/login').send({
        email: 'student@learning-matters.com',
        password: 'ValidPassword123!',
      });

      expect(loginRes.status).toBe(200);
      const loginBody = loginRes.body as { tokens: { accessToken: string; refreshToken: string } };
      expect(loginBody.tokens.accessToken).toBe('login-access-token');

      // 3. Refresh
      vi.spyOn(tokenService, 'rotateRefreshToken').mockResolvedValue({
        accessToken: 'rotated-access-token',
        refreshToken: 'rotated-refresh-token',
      });

      const refreshRes = await request(app).post('/api/v1/auth/refresh').send({
        refreshToken: 'login-refresh-token',
      });

      expect(refreshRes.status).toBe(200);
      const refreshBody = refreshRes.body as {
        tokens: { accessToken: string; refreshToken: string };
      };
      expect(refreshBody.tokens.accessToken).toBe('rotated-access-token');

      // 4. Logout
      const revokeSpy = vi.spyOn(tokenService, 'revokeToken').mockResolvedValue();

      const logoutRes = await request(app).post('/api/v1/auth/logout').send({
        refreshToken: 'rotated-refresh-token',
      });

      expect(logoutRes.status).toBe(204);
      expect(revokeSpy).toHaveBeenCalledWith('rotated-refresh-token');
    });
  });

  describe('Refresh Token Reuse Detection', () => {
    it('returns 401 when rotated refresh token is reused', async () => {
      vi.spyOn(tokenService, 'rotateRefreshToken').mockRejectedValue(
        new UnauthorizedError('Refresh token reuse detected. All sessions revoked.'),
      );

      const res = await request(app).post('/api/v1/auth/refresh').send({
        refreshToken: 'compromised-old-token',
      });

      expect(res.status).toBe(401);
      const body = res.body as ErrorResponsePayload;
      expect(body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('Role-Based Access Control (RBAC)', () => {
    it('denies access with 401 when Bearer token is missing', async () => {
      const res = await request(app).get('/api/v1/users/me');
      expect(res.status).toBe(401);
      const body = res.body as ErrorResponsePayload;
      expect(body.error.code).toBe('UNAUTHORIZED');
    });

    it('denies regular user from admin route with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);
      const body = res.body as ErrorResponsePayload;
      expect(body.error.code).toBe('FORBIDDEN');
    });

    it('allows admin user to access admin route with 200', async () => {
      vi.spyOn(usersRepository, 'list').mockResolvedValue([mockAdmin]);

      const res = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });
  });

  describe('Users CRUD & Validation', () => {
    it('returns 400 VALIDATION_ERROR on password less than 12 chars', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        email: 'invalid@learning-matters.com',
        password: 'Short1!',
      });

      expect(res.status).toBe(400);
      const body = res.body as ErrorResponsePayload;
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 409 CONFLICT on duplicate email registration', async () => {
      vi.spyOn(usersRepository, 'findByEmail').mockResolvedValue(mockUser);

      const res = await request(app).post('/api/v1/auth/register').send({
        email: 'student@learning-matters.com',
        password: 'ValidPassword123!',
      });

      expect(res.status).toBe(409);
      const body = res.body as ErrorResponsePayload;
      expect(body.error.code).toBe('CONFLICT');
    });

    it('returns user by id when accessed by owner', async () => {
      vi.spyOn(usersRepository, 'findById').mockResolvedValue(mockUser);

      const res = await request(app)
        .get(`/api/v1/users/${mockUser.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      const body = res.body as { data: UserSafe };
      expect(body.data.id).toBe(mockUser.id);
    });

    it('soft deletes user when requested by admin', async () => {
      vi.spyOn(usersRepository, 'findById').mockResolvedValue(mockUser);
      vi.spyOn(usersRepository, 'softDelete').mockResolvedValue(true);

      const res = await request(app)
        .delete(`/api/v1/users/${mockUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(204);
    });
  });

  describe('Cursor Pagination', () => {
    it('returns paginated users with nextCursor and hasMore flag', async () => {
      vi.spyOn(usersRepository, 'list').mockResolvedValue([
        mockAdmin,
        mockUser,
        {
          ...mockUser,
          id: '00000000-0000-4000-a000-000000000003',
          email: 'user3@learning-matters.com',
        },
      ]);

      const res = await request(app)
        .get('/api/v1/users?limit=2')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const body = res.body as {
        data: UserSafe[];
        pageInfo: { nextCursor: string | null; hasMore: boolean };
      };

      expect(body.data.length).toBe(2);
      expect(body.pageInfo.hasMore).toBe(true);
      expect(typeof body.pageInfo.nextCursor).toBe('string');
    });
  });

  describe('Rate Limiting (429)', () => {
    it('returns 429 TOO_MANY_REQUESTS when authentication rate limit is exceeded', async () => {
      const authApp = createApp();
      let lastRes: request.Response | null = null;

      // createAuthRateLimiter has limit: 10. Send 11 requests rapidly from a unique IP.
      for (let i = 0; i < 11; i++) {
        lastRes = await request(authApp)
          .post('/api/v1/auth/login')
          .set('X-Forwarded-For', '198.51.100.42')
          .send({
            email: 'ratelimit@example.com',
            password: 'Password123!',
          });
      }

      expect(lastRes).not.toBeNull();
      expect(lastRes?.status).toBe(429);
      const body = lastRes?.body as ErrorResponsePayload;
      expect(body.error.code).toBe('TOO_MANY_REQUESTS');
    });
  });
});
