import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../../app.js';
import { env } from '../../config/env.js';
import { schoolsRepository } from './schools.repository.js';
import type { School } from '../../db/schema/schools.js';
import type { ErrorResponsePayload } from '../../middleware/error-handler.js';

describe('Schools Module API', () => {
  const sampleSchool: School = {
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
    createdAt: new Date('2026-01-01T12:00:00Z'),
    updatedAt: new Date('2026-01-01T12:00:00Z'),
    deletedAt: null,
  };

  const superAdminToken = jwt.sign(
    { sub: 'user-sa', role: 'super_admin', schoolId: null, jti: 'sa-jti' },
    env.JWT_ACCESS_SECRET,
  );

  const ownSchoolAdminToken = jwt.sign(
    { sub: 'user-admin', role: 'admin', schoolId: sampleSchool.id, jti: 'admin-jti' },
    env.JWT_ACCESS_SECRET,
  );

  const otherSchoolAdminToken = jwt.sign(
    {
      sub: 'user-other-admin',
      role: 'admin',
      schoolId: '22222222-2222-4222-a222-222222222222',
      jti: 'other-jti',
    },
    env.JWT_ACCESS_SECRET,
  );

  const ownSchoolPrincipalToken = jwt.sign(
    { sub: 'user-principal', role: 'principal', schoolId: sampleSchool.id, jti: 'prin-jti' },
    env.JWT_ACCESS_SECRET,
  );

  const studentToken = jwt.sign(
    { sub: 'user-student', role: 'student', schoolId: sampleSchool.id, jti: 'stu-jti' },
    env.JWT_ACCESS_SECRET,
  );

  describe('POST /api/v1/schools', () => {
    it('creates a school and returns 201 for super_admin', async () => {
      const app = createApp();
      vi.spyOn(schoolsRepository, 'findByCode').mockResolvedValue(null);
      vi.spyOn(schoolsRepository, 'create').mockResolvedValue(sampleSchool);

      const res = await request(app)
        .post('/api/v1/schools')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: 'ABC International School',
          code: 'ABC001',
          status: 'active',
        });

      expect(res.status).toBe(201);
      const body = res.body as { data: School };
      expect(body.data.id).toBe(sampleSchool.id);
      expect(body.data.code).toBe('ABC001');
    });

    it('returns 409 when school code already exists', async () => {
      const app = createApp();
      vi.spyOn(schoolsRepository, 'findByCode').mockResolvedValue(sampleSchool);

      const res = await request(app)
        .post('/api/v1/schools')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: 'Another School',
          code: 'ABC001',
          status: 'active',
        });

      expect(res.status).toBe(409);
      const body = res.body as ErrorResponsePayload;
      expect(body.error.code).toBe('CONFLICT');
      expect(body.error.message).toContain('already exists');
    });

    it('returns 403 for non-super_admin (school admin)', async () => {
      const app = createApp();
      const res = await request(app)
        .post('/api/v1/schools')
        .set('Authorization', `Bearer ${ownSchoolAdminToken}`)
        .send({
          name: 'Test School',
          code: 'TEST01',
        });

      expect(res.status).toBe(403);
    });

    it('returns 401 without authentication', async () => {
      const app = createApp();
      const res = await request(app).post('/api/v1/schools').send({
        name: 'Test School',
        code: 'TEST01',
      });

      expect(res.status).toBe(401);
    });

    it('returns 400 when required fields are missing', async () => {
      const app = createApp();
      const res = await request(app)
        .post('/api/v1/schools')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: '',
        });

      expect(res.status).toBe(400);
      const body = res.body as ErrorResponsePayload;
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/schools', () => {
    it('returns 200 with paginated list for super_admin', async () => {
      const app = createApp();
      vi.spyOn(schoolsRepository, 'list').mockResolvedValue([sampleSchool]);

      const res = await request(app)
        .get('/api/v1/schools?limit=10')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      const body = res.body as { data: School[]; pageInfo: { hasMore: boolean } };
      expect(body.data).toHaveLength(1);
      expect(body.pageInfo.hasMore).toBe(false);
    });

    it('returns 403 for regular school admin', async () => {
      const app = createApp();
      const res = await request(app)
        .get('/api/v1/schools')
        .set('Authorization', `Bearer ${ownSchoolAdminToken}`);

      expect(res.status).toBe(403);
    });

    it('returns 403 for student', async () => {
      const app = createApp();
      const res = await request(app)
        .get('/api/v1/schools')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/v1/schools/:schoolId', () => {
    it('returns 200 for super_admin regardless of schoolId', async () => {
      const app = createApp();
      vi.spyOn(schoolsRepository, 'findById').mockResolvedValue(sampleSchool);

      const res = await request(app)
        .get(`/api/v1/schools/${sampleSchool.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      const body = res.body as { data: School };
      expect(body.data.id).toBe(sampleSchool.id);
    });

    it('returns 200 for own-school admin', async () => {
      const app = createApp();
      vi.spyOn(schoolsRepository, 'findById').mockResolvedValue(sampleSchool);

      const res = await request(app)
        .get(`/api/v1/schools/${sampleSchool.id}`)
        .set('Authorization', `Bearer ${ownSchoolAdminToken}`);

      expect(res.status).toBe(200);
      const body = res.body as { data: School };
      expect(body.data.id).toBe(sampleSchool.id);
    });

    it('returns 200 for own-school principal', async () => {
      const app = createApp();
      vi.spyOn(schoolsRepository, 'findById').mockResolvedValue(sampleSchool);

      const res = await request(app)
        .get(`/api/v1/schools/${sampleSchool.id}`)
        .set('Authorization', `Bearer ${ownSchoolPrincipalToken}`);

      expect(res.status).toBe(200);
      const body = res.body as { data: School };
      expect(body.data.id).toBe(sampleSchool.id);
    });

    it('returns 403 for other-school admin', async () => {
      const app = createApp();
      const res = await request(app)
        .get(`/api/v1/schools/${sampleSchool.id}`)
        .set('Authorization', `Bearer ${otherSchoolAdminToken}`);

      expect(res.status).toBe(403);
    });

    it('returns 403 for student role', async () => {
      const app = createApp();
      const res = await request(app)
        .get(`/api/v1/schools/${sampleSchool.id}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
    });

    it('returns 404 when school is not found', async () => {
      const app = createApp();
      vi.spyOn(schoolsRepository, 'findById').mockResolvedValue(null);

      const res = await request(app)
        .get('/api/v1/schools/99999999-9999-4999-a999-999999999999')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(404);
      const body = res.body as ErrorResponsePayload;
      expect(body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('PATCH /api/v1/schools/:schoolId', () => {
    it('updates school and returns 200 for super_admin', async () => {
      const app = createApp();
      vi.spyOn(schoolsRepository, 'findById').mockResolvedValue(sampleSchool);
      vi.spyOn(schoolsRepository, 'update').mockResolvedValue({
        ...sampleSchool,
        name: 'New School Name',
      });

      const res = await request(app)
        .patch(`/api/v1/schools/${sampleSchool.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ name: 'New School Name' });

      expect(res.status).toBe(200);
      const body = res.body as { data: School };
      expect(body.data.name).toBe('New School Name');
    });

    it('returns 403 for school admin attempting to update school', async () => {
      const app = createApp();
      const res = await request(app)
        .patch(`/api/v1/schools/${sampleSchool.id}`)
        .set('Authorization', `Bearer ${ownSchoolAdminToken}`)
        .send({ name: 'New Name' });

      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/v1/schools/:schoolId', () => {
    it('soft deletes school and returns 204 for super_admin', async () => {
      const app = createApp();
      vi.spyOn(schoolsRepository, 'findById').mockResolvedValue(sampleSchool);
      vi.spyOn(schoolsRepository, 'softDelete').mockResolvedValue(true);

      const res = await request(app)
        .delete(`/api/v1/schools/${sampleSchool.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(204);
    });

    it('returns 403 for school admin attempting to delete school', async () => {
      const app = createApp();
      const res = await request(app)
        .delete(`/api/v1/schools/${sampleSchool.id}`)
        .set('Authorization', `Bearer ${ownSchoolAdminToken}`);

      expect(res.status).toBe(403);
    });
  });
});
