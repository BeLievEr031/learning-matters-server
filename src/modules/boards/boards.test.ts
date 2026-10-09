import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../../app.js';
import { env } from '../../config/env.js';
import { boardsRepository } from './boards.repository.js';
import { schoolsRepository } from '../schools/schools.repository.js';
import { gradesRepository } from '../grades/grades.repository.js';
import type { Board } from '../../db/schema/boards.js';
import type { School } from '../../db/schema/schools.js';
import type { ErrorResponsePayload } from '../../middleware/error-handler.js';

describe('Boards Module API', () => {
  const school1: School = {
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

  const school2: School = {
    id: '22222222-2222-4222-a222-222222222222',
    name: 'XYZ Global Academy',
    code: 'XYZ001',
    address: '84 Wisdom Road',
    city: 'Mumbai',
    state: 'Maharashtra',
    country: 'India',
    phone: '+919876543211',
    email: 'contact@xyzacademy.edu',
    website: 'https://xyzacademy.edu',
    logoUrl: null,
    status: 'active',
    createdAt: new Date('2026-01-01T12:00:00Z'),
    updatedAt: new Date('2026-01-01T12:00:00Z'),
    deletedAt: null,
  };

  const sampleBoard: Board = {
    id: '33333333-3333-4333-a333-333333333333',
    schoolId: school1.id,
    name: 'Central Board of Secondary Education',
    code: 'CBSE',
    description: 'National education board',
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
    { sub: 'user-admin1', role: 'admin', schoolId: school1.id, jti: 'admin1-jti' },
    env.JWT_ACCESS_SECRET,
  );

  const otherSchoolAdminToken = jwt.sign(
    { sub: 'user-admin2', role: 'admin', schoolId: school2.id, jti: 'admin2-jti' },
    env.JWT_ACCESS_SECRET,
  );

  const ownSchoolPrincipalToken = jwt.sign(
    { sub: 'user-prin1', role: 'principal', schoolId: school1.id, jti: 'prin1-jti' },
    env.JWT_ACCESS_SECRET,
  );

  const studentToken = jwt.sign(
    { sub: 'user-student', role: 'student', schoolId: school1.id, jti: 'stu-jti' },
    env.JWT_ACCESS_SECRET,
  );

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(gradesRepository, 'hasActiveGradesByBoard').mockResolvedValue(false);
  });

  describe('POST /api/v1/schools/:schoolId/boards', () => {
    it('creates a board and returns 201 for super_admin', async () => {
      const app = createApp();
      vi.spyOn(schoolsRepository, 'findById').mockResolvedValue(school1);
      vi.spyOn(boardsRepository, 'findBySchoolAndCode').mockResolvedValue(null);
      vi.spyOn(boardsRepository, 'create').mockResolvedValue(sampleBoard);

      const res = await request(app)
        .post(`/api/v1/schools/${school1.id}/boards`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: 'Central Board of Secondary Education',
          code: 'CBSE',
          description: 'National education board',
          status: 'active',
        });

      expect(res.status).toBe(201);
      const body = res.body as { data: Board };
      expect(body.data.id).toBe(sampleBoard.id);
      expect(body.data.code).toBe('CBSE');
    });

    it('creates a board and returns 201 for own-school admin', async () => {
      const app = createApp();
      vi.spyOn(schoolsRepository, 'findById').mockResolvedValue(school1);
      vi.spyOn(boardsRepository, 'findBySchoolAndCode').mockResolvedValue(null);
      vi.spyOn(boardsRepository, 'create').mockResolvedValue(sampleBoard);

      const res = await request(app)
        .post(`/api/v1/schools/${school1.id}/boards`)
        .set('Authorization', `Bearer ${ownSchoolAdminToken}`)
        .send({
          name: 'Central Board of Secondary Education',
          code: 'CBSE',
          status: 'active',
        });

      expect(res.status).toBe(201);
      const body = res.body as { data: Board };
      expect(body.data.id).toBe(sampleBoard.id);
    });

    it('returns 403 for admin from another school (school isolation)', async () => {
      const app = createApp();

      const res = await request(app)
        .post(`/api/v1/schools/${school1.id}/boards`)
        .set('Authorization', `Bearer ${otherSchoolAdminToken}`)
        .send({
          name: 'Central Board of Secondary Education',
          code: 'CBSE',
          status: 'active',
        });

      expect(res.status).toBe(403);
      const body = res.body as ErrorResponsePayload;
      expect(body.error.code).toBe('FORBIDDEN');
    });

    it('returns 403 for principal and student', async () => {
      const app = createApp();

      const resPrin = await request(app)
        .post(`/api/v1/schools/${school1.id}/boards`)
        .set('Authorization', `Bearer ${ownSchoolPrincipalToken}`)
        .send({ name: 'CBSE', code: 'CBSE' });
      expect(resPrin.status).toBe(403);

      const resStu = await request(app)
        .post(`/api/v1/schools/${school1.id}/boards`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ name: 'CBSE', code: 'CBSE' });
      expect(resStu.status).toBe(403);
    });

    it('returns 409 when board code already exists in the same school', async () => {
      const app = createApp();
      vi.spyOn(schoolsRepository, 'findById').mockResolvedValue(school1);
      vi.spyOn(boardsRepository, 'findBySchoolAndCode').mockResolvedValue(sampleBoard);

      const res = await request(app)
        .post(`/api/v1/schools/${school1.id}/boards`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: 'CBSE Duplicate',
          code: 'CBSE',
          status: 'active',
        });

      expect(res.status).toBe(409);
      const body = res.body as ErrorResponsePayload;
      expect(body.error.code).toBe('CONFLICT');
    });

    it('returns 404 when school does not exist', async () => {
      const app = createApp();
      vi.spyOn(schoolsRepository, 'findById').mockResolvedValue(null);

      const res = await request(app)
        .post(`/api/v1/schools/${school1.id}/boards`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: 'CBSE',
          code: 'CBSE',
        });

      expect(res.status).toBe(404);
      const body = res.body as ErrorResponsePayload;
      expect(body.error.code).toBe('NOT_FOUND');
    });

    it('returns 400 when body fails schema validation', async () => {
      const app = createApp();

      const res = await request(app)
        .post(`/api/v1/schools/${school1.id}/boards`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: '',
          code: '',
        });

      expect(res.status).toBe(400);
      const body = res.body as ErrorResponsePayload;
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/schools/:schoolId/boards', () => {
    it('returns paginated boards for super_admin', async () => {
      const app = createApp();
      vi.spyOn(schoolsRepository, 'findById').mockResolvedValue(school1);
      vi.spyOn(boardsRepository, 'listBySchool').mockResolvedValue([sampleBoard]);

      const res = await request(app)
        .get(`/api/v1/schools/${school1.id}/boards`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      const body = res.body as { data: Board[]; pageInfo: { hasMore: boolean } };
      expect(body.data).toHaveLength(1);
      expect(body.data[0]?.id).toBe(sampleBoard.id);
    });

    it('returns boards for own school admin and principal', async () => {
      const app = createApp();
      vi.spyOn(schoolsRepository, 'findById').mockResolvedValue(school1);
      vi.spyOn(boardsRepository, 'listBySchool').mockResolvedValue([sampleBoard]);

      const resAdmin = await request(app)
        .get(`/api/v1/schools/${school1.id}/boards`)
        .set('Authorization', `Bearer ${ownSchoolAdminToken}`);
      expect(resAdmin.status).toBe(200);

      const resPrin = await request(app)
        .get(`/api/v1/schools/${school1.id}/boards`)
        .set('Authorization', `Bearer ${ownSchoolPrincipalToken}`);
      expect(resPrin.status).toBe(200);
    });

    it('returns 403 for admin from another school', async () => {
      const app = createApp();

      const res = await request(app)
        .get(`/api/v1/schools/${school1.id}/boards`)
        .set('Authorization', `Bearer ${otherSchoolAdminToken}`);

      expect(res.status).toBe(403);
    });

    it('returns 403 for students', async () => {
      const app = createApp();

      const res = await request(app)
        .get(`/api/v1/schools/${school1.id}/boards`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/v1/boards/:boardId', () => {
    it('returns board by ID for super_admin', async () => {
      const app = createApp();
      vi.spyOn(boardsRepository, 'findById').mockResolvedValue(sampleBoard);

      const res = await request(app)
        .get(`/api/v1/boards/${sampleBoard.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      const body = res.body as { data: Board };
      expect(body.data.id).toBe(sampleBoard.id);
    });

    it('returns board by ID for own school admin and principal', async () => {
      const app = createApp();
      vi.spyOn(boardsRepository, 'findById').mockResolvedValue(sampleBoard);

      const resAdmin = await request(app)
        .get(`/api/v1/boards/${sampleBoard.id}`)
        .set('Authorization', `Bearer ${ownSchoolAdminToken}`);
      expect(resAdmin.status).toBe(200);

      const resPrin = await request(app)
        .get(`/api/v1/boards/${sampleBoard.id}`)
        .set('Authorization', `Bearer ${ownSchoolPrincipalToken}`);
      expect(resPrin.status).toBe(200);
    });

    it('returns 403 for admin of a different school', async () => {
      const app = createApp();
      vi.spyOn(boardsRepository, 'findById').mockResolvedValue(sampleBoard);

      const res = await request(app)
        .get(`/api/v1/boards/${sampleBoard.id}`)
        .set('Authorization', `Bearer ${otherSchoolAdminToken}`);

      expect(res.status).toBe(403);
      const body = res.body as ErrorResponsePayload;
      expect(body.error.code).toBe('FORBIDDEN');
    });

    it('returns 404 when board does not exist', async () => {
      const app = createApp();
      vi.spyOn(boardsRepository, 'findById').mockResolvedValue(null);

      const res = await request(app)
        .get('/api/v1/boards/99999999-9999-4999-a999-999999999999')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(404);
      const body = res.body as ErrorResponsePayload;
      expect(body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('PATCH /api/v1/boards/:boardId', () => {
    it('updates board for super_admin', async () => {
      const app = createApp();
      vi.spyOn(boardsRepository, 'findById').mockResolvedValue(sampleBoard);
      vi.spyOn(boardsRepository, 'update').mockResolvedValue({
        ...sampleBoard,
        name: 'CBSE Updated',
      });

      const res = await request(app)
        .patch(`/api/v1/boards/${sampleBoard.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ name: 'CBSE Updated' });

      expect(res.status).toBe(200);
      const body = res.body as { data: Board };
      expect(body.data.name).toBe('CBSE Updated');
    });

    it('updates board for own school admin', async () => {
      const app = createApp();
      vi.spyOn(boardsRepository, 'findById').mockResolvedValue(sampleBoard);
      vi.spyOn(boardsRepository, 'update').mockResolvedValue({
        ...sampleBoard,
        name: 'CBSE Updated',
      });

      const res = await request(app)
        .patch(`/api/v1/boards/${sampleBoard.id}`)
        .set('Authorization', `Bearer ${ownSchoolAdminToken}`)
        .send({ name: 'CBSE Updated' });

      expect(res.status).toBe(200);
    });

    it('returns 403 for admin from another school', async () => {
      const app = createApp();
      vi.spyOn(boardsRepository, 'findById').mockResolvedValue(sampleBoard);

      const res = await request(app)
        .patch(`/api/v1/boards/${sampleBoard.id}`)
        .set('Authorization', `Bearer ${otherSchoolAdminToken}`)
        .send({ name: 'Hacked Name' });

      expect(res.status).toBe(403);
    });

    it('returns 403 for principal and students', async () => {
      const app = createApp();

      const resPrin = await request(app)
        .patch(`/api/v1/boards/${sampleBoard.id}`)
        .set('Authorization', `Bearer ${ownSchoolPrincipalToken}`)
        .send({ name: 'Updated' });
      expect(resPrin.status).toBe(403);
    });
  });

  describe('DELETE /api/v1/boards/:boardId', () => {
    it('soft deletes board and returns 204 for super_admin', async () => {
      const app = createApp();
      vi.spyOn(boardsRepository, 'findById').mockResolvedValue(sampleBoard);
      vi.spyOn(boardsRepository, 'softDelete').mockResolvedValue(true);

      const res = await request(app)
        .delete(`/api/v1/boards/${sampleBoard.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(204);
    });

    it('soft deletes board and returns 204 for own school admin', async () => {
      const app = createApp();
      vi.spyOn(boardsRepository, 'findById').mockResolvedValue(sampleBoard);
      vi.spyOn(boardsRepository, 'softDelete').mockResolvedValue(true);

      const res = await request(app)
        .delete(`/api/v1/boards/${sampleBoard.id}`)
        .set('Authorization', `Bearer ${ownSchoolAdminToken}`);

      expect(res.status).toBe(204);
    });

    it('returns 409 Conflict when deleting board with active grades', async () => {
      const app = createApp();
      vi.spyOn(boardsRepository, 'findById').mockResolvedValue(sampleBoard);
      vi.spyOn(gradesRepository, 'hasActiveGradesByBoard').mockResolvedValue(true);

      const res = await request(app)
        .delete(`/api/v1/boards/${sampleBoard.id}`)
        .set('Authorization', `Bearer ${ownSchoolAdminToken}`);

      expect(res.status).toBe(409);
    });

    it('returns 403 for admin from another school', async () => {
      const app = createApp();
      vi.spyOn(boardsRepository, 'findById').mockResolvedValue(sampleBoard);

      const res = await request(app)
        .delete(`/api/v1/boards/${sampleBoard.id}`)
        .set('Authorization', `Bearer ${otherSchoolAdminToken}`);

      expect(res.status).toBe(403);
    });

    it('returns 403 for principal and students', async () => {
      const app = createApp();

      const resPrin = await request(app)
        .delete(`/api/v1/boards/${sampleBoard.id}`)
        .set('Authorization', `Bearer ${ownSchoolPrincipalToken}`);
      expect(resPrin.status).toBe(403);

      const resStu = await request(app)
        .delete(`/api/v1/boards/${sampleBoard.id}`)
        .set('Authorization', `Bearer ${studentToken}`);
      expect(resStu.status).toBe(403);
    });

    it('returns 404 when board does not exist', async () => {
      const app = createApp();
      vi.spyOn(boardsRepository, 'findById').mockResolvedValue(null);

      const res = await request(app)
        .delete('/api/v1/boards/99999999-9999-4999-a999-999999999999')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(404);
    });
  });
});
