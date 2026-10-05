import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../../app.js';
import { env } from '../../config/env.js';
import { usersRepository, type UserSafe } from './users.repository.js';
import { encodeCursor, decodeCursor } from '../../lib/pagination.js';
import type { ErrorResponsePayload } from '../../middleware/error-handler.js';

interface UserResponseData {
  id?: string;
  email?: string;
  passwordHash?: string;
  password_hash?: string;
}

describe('Users Module', () => {
  const sampleUser: UserSafe = {
    id: '11111111-1111-4111-a111-111111111111',
    email: 'test@learning-matters.com',
    role: 'student',
    schoolId: null,
    firstName: null,
    lastName: null,
    phone: null,
    status: 'active',
    isActive: true,
    createdAt: new Date('2026-01-01T12:00:00Z'),
    updatedAt: new Date('2026-01-01T12:00:00Z'),
    deletedAt: null,
  };

  const adminToken = jwt.sign(
    { sub: sampleUser.id, role: 'admin', schoolId: 'school-uuid-1', jti: 'admin-jti' },
    env.JWT_ACCESS_SECRET,
  );

  describe('Pagination Utilities', () => {
    it('encodes and decodes cursor correctly', () => {
      const now = new Date();
      const id = '11111111-1111-4111-a111-111111111111';
      const encoded = encodeCursor({ createdAt: now, id });

      expect(typeof encoded).toBe('string');
      const decoded = decodeCursor(encoded);
      expect(decoded).not.toBeNull();
      expect(decoded?.id).toBe(id);
      expect(decoded?.createdAt.toISOString()).toBe(now.toISOString());
    });

    it('returns null on invalid cursor', () => {
      expect(decodeCursor('invalid-base64-string')).toBeNull();
    });
  });

  describe('POST /api/v1/users', () => {
    it('creates a user and returns 201 without password_hash', async () => {
      const app = createApp();
      vi.spyOn(usersRepository, 'findByEmail').mockResolvedValue(null);
      vi.spyOn(usersRepository, 'create').mockResolvedValue(sampleUser);

      const res = await request(app)
        .post('/api/v1/users')
        .send({ email: 'test@learning-matters.com', password: 'Password123!' });

      expect(res.status).toBe(201);
      const body = res.body as { data: UserResponseData };
      expect(body.data.email).toBe('test@learning-matters.com');
      expect(body.data.passwordHash).toBeUndefined();
      expect(body.data.password_hash).toBeUndefined();
    });

    it('returns 409 with standard error shape on duplicate email', async () => {
      const app = createApp();
      vi.spyOn(usersRepository, 'findByEmail').mockResolvedValue(sampleUser);

      const res = await request(app)
        .post('/api/v1/users')
        .send({ email: 'test@learning-matters.com', password: 'Password123!' });

      expect(res.status).toBe(409);
      const body = res.body as ErrorResponsePayload;
      expect(body.error.code).toBe('CONFLICT');
      expect(body.error.message).toContain('already exists');
    });
  });

  describe('GET /api/v1/users/:id', () => {
    it('returns 200 with user data without password_hash', async () => {
      const app = createApp();
      vi.spyOn(usersRepository, 'findById').mockResolvedValue(sampleUser);

      const res = await request(app)
        .get(`/api/v1/users/${sampleUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const body = res.body as { data: UserResponseData };
      expect(body.data.id).toBe(sampleUser.id);
      expect(body.data.passwordHash).toBeUndefined();
      expect(body.data.password_hash).toBeUndefined();
    });

    it('returns 404 when user is not found', async () => {
      const app = createApp();
      vi.spyOn(usersRepository, 'findById').mockResolvedValue(null);

      const res = await request(app)
        .get('/api/v1/users/22222222-2222-4222-a222-222222222222')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      const body = res.body as ErrorResponsePayload;
      expect(body.error.code).toBe('NOT_FOUND');
    });

    it('returns 401 without authentication', async () => {
      const app = createApp();
      const res = await request(app).get(`/api/v1/users/${sampleUser.id}`);
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/users/me', () => {
    it('returns current authenticated user profile', async () => {
      const app = createApp();
      vi.spyOn(usersRepository, 'findById').mockResolvedValue(sampleUser);

      const userToken = jwt.sign(
        { sub: sampleUser.id, role: 'student', schoolId: null, jti: 'user-jti' },
        env.JWT_ACCESS_SECRET,
      );

      const res = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      const body = res.body as { data: UserResponseData };
      expect(body.data.id).toBe(sampleUser.id);
      expect(body.data.email).toBe(sampleUser.email);
    });
  });

  describe('PATCH /api/v1/users/:id', () => {
    it('updates user email successfully', async () => {
      const app = createApp();
      vi.spyOn(usersRepository, 'findById').mockResolvedValue(sampleUser);
      vi.spyOn(usersRepository, 'findByEmail').mockResolvedValue(null);
      vi.spyOn(usersRepository, 'update').mockResolvedValue({
        ...sampleUser,
        email: 'newemail@learning-matters.com',
      });

      const res = await request(app)
        .patch(`/api/v1/users/${sampleUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'newemail@learning-matters.com' });

      expect(res.status).toBe(200);
      const body = res.body as { data: UserResponseData };
      expect(body.data.email).toBe('newemail@learning-matters.com');
      expect(body.data.passwordHash).toBeUndefined();
    });
  });

  describe('DELETE /api/v1/users/:id', () => {
    it('soft deletes user and returns 204', async () => {
      const app = createApp();
      vi.spyOn(usersRepository, 'findById').mockResolvedValue(sampleUser);
      vi.spyOn(usersRepository, 'softDelete').mockResolvedValue(true);

      const res = await request(app)
        .delete(`/api/v1/users/${sampleUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(204);
    });
  });

  describe('GET /api/v1/users (pagination)', () => {
    it('returns stable cursor-based pagination and never returns password_hash', async () => {
      const app = createApp();
      const usersList: UserSafe[] = [
        sampleUser,
        {
          ...sampleUser,
          id: '22222222-2222-4222-a222-222222222222',
          email: 'user2@learning-matters.com',
        },
        {
          ...sampleUser,
          id: '33333333-3333-4333-a333-333333333333',
          email: 'user3@learning-matters.com',
        },
      ];

      vi.spyOn(usersRepository, 'list').mockResolvedValue(usersList);

      const res = await request(app)
        .get('/api/v1/users?limit=2')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const body = res.body as {
        data: UserResponseData[];
        pageInfo: { nextCursor: string | null; hasMore: boolean };
      };

      expect(body.data.length).toBe(2);
      expect(body.pageInfo.hasMore).toBe(true);
      expect(typeof body.pageInfo.nextCursor).toBe('string');
      expect(body.data[0]?.passwordHash).toBeUndefined();
    });

    it('rejects limit exceeding MAX_PAGE_SIZE (100) with 400', async () => {
      const app = createApp();
      const res = await request(app)
        .get('/api/v1/users?limit=500')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      const body = res.body as ErrorResponsePayload;
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
