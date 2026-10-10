import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../../src/app.js';
import { env } from '../../src/config/env.js';
import { schoolsRepository } from '../../src/modules/schools/schools.repository.js';
import type { School } from '../../src/db/schema/schools.js';

describe('Schools Integration Tests', () => {
  const app = createApp();

  const schoolA: School = {
    id: '11111111-1111-4111-a111-111111111111',
    name: 'School Alpha',
    code: 'SCH-A',
    address: '123 Main St',
    city: 'Delhi',
    state: 'Delhi',
    country: 'India',
    phone: '+919876543210',
    email: 'alpha@school.edu',
    website: 'https://alpha.edu',
    logoUrl: null,
    status: 'active',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    deletedAt: null,
  };

  const superAdminToken = jwt.sign(
    { sub: 'user-sa', role: 'super_admin', schoolId: null, jti: 'sa-jti' },
    env.JWT_ACCESS_SECRET,
  );

  const schoolAdminToken = jwt.sign(
    { sub: 'user-admin-a', role: 'admin', schoolId: schoolA.id, jti: 'admin-a-jti' },
    env.JWT_ACCESS_SECRET,
  );

  const otherSchoolAdminToken = jwt.sign(
    {
      sub: 'user-admin-b',
      role: 'admin',
      schoolId: '22222222-2222-4222-a222-222222222222',
      jti: 'admin-b-jti',
    },
    env.JWT_ACCESS_SECRET,
  );

  const studentToken = jwt.sign(
    { sub: 'user-student', role: 'student', schoolId: schoolA.id, jti: 'stu-jti' },
    env.JWT_ACCESS_SECRET,
  );

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Role Isolation Scenarios', () => {
    it('allows super_admin to create school (201)', async () => {
      vi.spyOn(schoolsRepository, 'findByCode').mockResolvedValue(null);
      vi.spyOn(schoolsRepository, 'create').mockResolvedValue(schoolA);

      const res = await request(app)
        .post('/api/v1/schools')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: 'School Alpha',
          code: 'SCH-A',
        });

      expect(res.status).toBe(201);
      expect((res.body as { data: School }).data.id).toBe(schoolA.id);
    });

    it('denies school admin from creating school (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/v1/schools')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          name: 'New School',
          code: 'NEW-01',
        });

      expect(res.status).toBe(403);
    });

    it('allows school admin to read their own school profile (200)', async () => {
      vi.spyOn(schoolsRepository, 'findById').mockResolvedValue(schoolA);

      const res = await request(app)
        .get(`/api/v1/schools/${schoolA.id}`)
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      expect(res.status).toBe(200);
      expect((res.body as { data: School }).data.code).toBe(schoolA.code);
    });

    it('forbids school admin from accessing a different school (403 Forbidden)', async () => {
      vi.spyOn(schoolsRepository, 'findById').mockResolvedValue(schoolA);

      const res = await request(app)
        .get(`/api/v1/schools/${schoolA.id}`)
        .set('Authorization', `Bearer ${otherSchoolAdminToken}`);

      expect(res.status).toBe(403);
    });

    it('denies regular student from listing schools (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/v1/schools')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
    });

    it('allows super_admin to soft-delete school (204)', async () => {
      vi.spyOn(schoolsRepository, 'findById').mockResolvedValue(schoolA);
      vi.spyOn(schoolsRepository, 'softDelete').mockResolvedValue(true);

      const res = await request(app)
        .delete(`/api/v1/schools/${schoolA.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(204);
    });
  });
});
