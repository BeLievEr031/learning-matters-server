import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../../src/app.js';
import { env } from '../../src/config/env.js';
import { boardsRepository } from '../../src/modules/boards/boards.repository.js';
import { schoolsRepository } from '../../src/modules/schools/schools.repository.js';
import { gradesRepository } from '../../src/modules/grades/grades.repository.js';
import type { Board } from '../../src/db/schema/boards.js';
import type { School } from '../../src/db/schema/schools.js';

describe('Boards Integration Tests', () => {
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

  const boardA: Board = {
    id: 'bbbbbbbb-bbbb-4bbb-abbb-bbbbbbbbbbbb',
    schoolId: schoolA.id,
    name: 'Central Board of Secondary Education',
    code: 'CBSE',
    description: 'National education board',
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

  describe('School-Scoped Board Operations', () => {
    it('allows school admin to create board under own school (201)', async () => {
      vi.spyOn(schoolsRepository, 'findById').mockResolvedValue(schoolA);
      vi.spyOn(boardsRepository, 'findBySchoolAndCode').mockResolvedValue(null);
      vi.spyOn(boardsRepository, 'create').mockResolvedValue(boardA);

      const res = await request(app)
        .post(`/api/v1/schools/${schoolA.id}/boards`)
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          name: 'Central Board of Secondary Education',
          code: 'CBSE',
          description: 'National education board',
        });

      expect(res.status).toBe(201);
      expect((res.body as { data: Board }).data.code).toBe('CBSE');
    });

    it('denies school admin from creating board under another school (403 Forbidden)', async () => {
      const res = await request(app)
        .post(`/api/v1/schools/${schoolA.id}/boards`)
        .set('Authorization', `Bearer ${otherSchoolAdminToken}`)
        .send({
          name: 'CBSE Board',
          code: 'CBSE',
        });

      expect(res.status).toBe(403);
    });

    it('allows super_admin to create board under any school (201)', async () => {
      vi.spyOn(schoolsRepository, 'findById').mockResolvedValue(schoolA);
      vi.spyOn(boardsRepository, 'findBySchoolAndCode').mockResolvedValue(null);
      vi.spyOn(boardsRepository, 'create').mockResolvedValue(boardA);

      const res = await request(app)
        .post(`/api/v1/schools/${schoolA.id}/boards`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: 'Central Board of Secondary Education',
          code: 'CBSE',
        });

      expect(res.status).toBe(201);
    });

    it('rejects duplicate board code within same school (409 Conflict)', async () => {
      vi.spyOn(schoolsRepository, 'findById').mockResolvedValue(schoolA);
      vi.spyOn(boardsRepository, 'findBySchoolAndCode').mockResolvedValue(boardA);

      const res = await request(app)
        .post(`/api/v1/schools/${schoolA.id}/boards`)
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          name: 'Duplicate CBSE',
          code: 'CBSE',
        });

      expect(res.status).toBe(409);
    });

    it('allows school admin to list boards under own school (200)', async () => {
      vi.spyOn(schoolsRepository, 'findById').mockResolvedValue(schoolA);
      vi.spyOn(boardsRepository, 'listBySchool').mockResolvedValue([boardA]);

      const res = await request(app)
        .get(`/api/v1/schools/${schoolA.id}/boards`)
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      expect(res.status).toBe(200);
      expect((res.body as { data: Board[] }).data).toHaveLength(1);
    });

    it('denies other school admin from listing boards of a different school (403)', async () => {
      const res = await request(app)
        .get(`/api/v1/schools/${schoolA.id}/boards`)
        .set('Authorization', `Bearer ${otherSchoolAdminToken}`);

      expect(res.status).toBe(403);
    });

    it('denies regular student from managing boards (403)', async () => {
      const res = await request(app)
        .get(`/api/v1/schools/${schoolA.id}/boards`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
    });

    it('allows school admin to get board by ID (200)', async () => {
      vi.spyOn(boardsRepository, 'findById').mockResolvedValue(boardA);

      const res = await request(app)
        .get(`/api/v1/boards/${boardA.id}`)
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      expect(res.status).toBe(200);
      expect((res.body as { data: Board }).data.id).toBe(boardA.id);
    });

    it('denies other school admin from fetching board by ID (403 Forbidden)', async () => {
      vi.spyOn(boardsRepository, 'findById').mockResolvedValue(boardA);

      const res = await request(app)
        .get(`/api/v1/boards/${boardA.id}`)
        .set('Authorization', `Bearer ${otherSchoolAdminToken}`);

      expect(res.status).toBe(403);
    });

    it('allows school admin to update board (200)', async () => {
      vi.spyOn(boardsRepository, 'findById').mockResolvedValue(boardA);
      vi.spyOn(boardsRepository, 'update').mockResolvedValue({
        ...boardA,
        name: 'Updated Board Name',
      });

      const res = await request(app)
        .patch(`/api/v1/boards/${boardA.id}`)
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          name: 'Updated Board Name',
        });

      expect(res.status).toBe(200);
      expect((res.body as { data: Board }).data.name).toBe('Updated Board Name');
    });

    it('rejects soft-delete if board has active grades (409 Conflict)', async () => {
      vi.spyOn(boardsRepository, 'findById').mockResolvedValue(boardA);
      vi.spyOn(gradesRepository, 'hasActiveGradesByBoard').mockResolvedValue(true);

      const res = await request(app)
        .delete(`/api/v1/boards/${boardA.id}`)
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      expect(res.status).toBe(409);
    });

    it('allows soft-delete if board has no active grades (204)', async () => {
      vi.spyOn(boardsRepository, 'findById').mockResolvedValue(boardA);
      vi.spyOn(gradesRepository, 'hasActiveGradesByBoard').mockResolvedValue(false);
      vi.spyOn(boardsRepository, 'softDelete').mockResolvedValue(true);

      const res = await request(app)
        .delete(`/api/v1/boards/${boardA.id}`)
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      expect(res.status).toBe(204);
    });
  });
});
