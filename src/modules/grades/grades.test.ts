import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../../app.js';
import { env } from '../../config/env.js';
import { gradesRepository } from './grades.repository.js';
import { boardsRepository } from '../boards/boards.repository.js';
import type { Grade } from '../../db/schema/grades.js';
import type { Board } from '../../db/schema/boards.js';
import type { ErrorResponsePayload } from '../../middleware/error-handler.js';

describe('Grades Module API', () => {
  const school1Id = '11111111-1111-4111-a111-111111111111';
  const school2Id = '22222222-2222-4222-a222-222222222222';

  const board1: Board = {
    id: '33333333-3333-4333-a333-333333333333',
    schoolId: school1Id,
    name: 'Central Board of Secondary Education',
    code: 'CBSE',
    description: 'National education board',
    status: 'active',
    createdAt: new Date('2026-01-01T12:00:00Z'),
    updatedAt: new Date('2026-01-01T12:00:00Z'),
    deletedAt: null,
  };

  const sampleGrade: Grade = {
    id: '44444444-4444-4444-a444-444444444444',
    schoolId: school1Id,
    boardId: board1.id,
    name: 'Grade 10 - Section A',
    code: 'G10-A',
    gradeNumber: 10,
    section: 'A',
    capacity: 40,
    classTeacherId: null,
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
    { sub: 'user-admin1', role: 'admin', schoolId: school1Id, jti: 'admin1-jti' },
    env.JWT_ACCESS_SECRET,
  );

  const otherSchoolAdminToken = jwt.sign(
    { sub: 'user-admin2', role: 'admin', schoolId: school2Id, jti: 'admin2-jti' },
    env.JWT_ACCESS_SECRET,
  );

  const ownSchoolPrincipalToken = jwt.sign(
    { sub: 'user-prin1', role: 'principal', schoolId: school1Id, jti: 'prin1-jti' },
    env.JWT_ACCESS_SECRET,
  );

  const ownSchoolClassTeacherToken = jwt.sign(
    { sub: 'user-ct1', role: 'class_teacher', schoolId: school1Id, jti: 'ct1-jti' },
    env.JWT_ACCESS_SECRET,
  );

  const studentToken = jwt.sign(
    { sub: 'user-student', role: 'student', schoolId: school1Id, jti: 'stu-jti' },
    env.JWT_ACCESS_SECRET,
  );

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /api/v1/boards/:boardId/grades', () => {
    it('creates a grade and returns 201 for super_admin', async () => {
      const app = createApp();
      vi.spyOn(boardsRepository, 'findById').mockResolvedValue(board1);
      vi.spyOn(gradesRepository, 'findByBoardGradeAndSection').mockResolvedValue(null);
      vi.spyOn(gradesRepository, 'create').mockResolvedValue(sampleGrade);

      const res = await request(app)
        .post(`/api/v1/boards/${board1.id}/grades`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: 'Grade 10 - Section A',
          code: 'G10-A',
          gradeNumber: 10,
          section: 'A',
          capacity: 40,
          status: 'active',
        });

      expect(res.status).toBe(201);
      const body = res.body as { data: Grade };
      expect(body.data.id).toBe(sampleGrade.id);
      expect(body.data.gradeNumber).toBe(10);
      expect(body.data.section).toBe('A');
    });

    it('creates a grade and returns 201 for own-school admin', async () => {
      const app = createApp();
      vi.spyOn(boardsRepository, 'findById').mockResolvedValue(board1);
      vi.spyOn(gradesRepository, 'findByBoardGradeAndSection').mockResolvedValue(null);
      vi.spyOn(gradesRepository, 'create').mockResolvedValue(sampleGrade);

      const res = await request(app)
        .post(`/api/v1/boards/${board1.id}/grades`)
        .set('Authorization', `Bearer ${ownSchoolAdminToken}`)
        .send({
          name: 'Grade 10 - Section A',
          code: 'G10-A',
          gradeNumber: 10,
          section: 'A',
          capacity: 40,
        });

      expect(res.status).toBe(201);
      const body = res.body as { data: Grade };
      expect(body.data.id).toBe(sampleGrade.id);
    });

    it('returns 403 for admin from another school', async () => {
      const app = createApp();
      vi.spyOn(boardsRepository, 'findById').mockResolvedValue(board1);

      const res = await request(app)
        .post(`/api/v1/boards/${board1.id}/grades`)
        .set('Authorization', `Bearer ${otherSchoolAdminToken}`)
        .send({
          name: 'Grade 10 - Section A',
          code: 'G10-A',
          gradeNumber: 10,
        });

      expect(res.status).toBe(403);
      const body = res.body as ErrorResponsePayload;
      expect(body.error.code).toBe('FORBIDDEN');
    });

    it('returns 403 for principal, class_teacher, and student on creation', async () => {
      const app = createApp();

      const resPrin = await request(app)
        .post(`/api/v1/boards/${board1.id}/grades`)
        .set('Authorization', `Bearer ${ownSchoolPrincipalToken}`)
        .send({ name: 'Grade 10', code: 'G10', gradeNumber: 10 });
      expect(resPrin.status).toBe(403);

      const resCT = await request(app)
        .post(`/api/v1/boards/${board1.id}/grades`)
        .set('Authorization', `Bearer ${ownSchoolClassTeacherToken}`)
        .send({ name: 'Grade 10', code: 'G10', gradeNumber: 10 });
      expect(resCT.status).toBe(403);

      const resStu = await request(app)
        .post(`/api/v1/boards/${board1.id}/grades`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ name: 'Grade 10', code: 'G10', gradeNumber: 10 });
      expect(resStu.status).toBe(403);
    });

    it('returns 409 when section already exists for this grade in the board', async () => {
      const app = createApp();
      vi.spyOn(boardsRepository, 'findById').mockResolvedValue(board1);
      vi.spyOn(gradesRepository, 'findByBoardGradeAndSection').mockResolvedValue(sampleGrade);

      const res = await request(app)
        .post(`/api/v1/boards/${board1.id}/grades`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: 'Duplicate Section',
          code: 'G10-A-DUP',
          gradeNumber: 10,
          section: 'A',
        });

      expect(res.status).toBe(409);
      const body = res.body as ErrorResponsePayload;
      expect(body.error.code).toBe('CONFLICT');
    });

    it('returns 404 when board does not exist', async () => {
      const app = createApp();
      vi.spyOn(boardsRepository, 'findById').mockResolvedValue(null);

      const res = await request(app)
        .post(`/api/v1/boards/${board1.id}/grades`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: 'Grade 10',
          code: 'G10',
          gradeNumber: 10,
        });

      expect(res.status).toBe(404);
      const body = res.body as ErrorResponsePayload;
      expect(body.error.code).toBe('NOT_FOUND');
    });

    it('returns 400 when body fails validation', async () => {
      const app = createApp();

      const res = await request(app)
        .post(`/api/v1/boards/${board1.id}/grades`)
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

  describe('GET /api/v1/boards/:boardId/grades', () => {
    it('returns paginated grades for super_admin', async () => {
      const app = createApp();
      vi.spyOn(boardsRepository, 'findById').mockResolvedValue(board1);
      vi.spyOn(gradesRepository, 'listByBoard').mockResolvedValue([sampleGrade]);

      const res = await request(app)
        .get(`/api/v1/boards/${board1.id}/grades`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      const body = res.body as { data: Grade[]; pageInfo: { hasMore: boolean } };
      expect(body.data).toHaveLength(1);
      expect(body.data[0]?.id).toBe(sampleGrade.id);
    });

    it('returns grades for own school admin, principal, and class_teacher', async () => {
      const app = createApp();
      vi.spyOn(boardsRepository, 'findById').mockResolvedValue(board1);
      vi.spyOn(gradesRepository, 'listByBoard').mockResolvedValue([sampleGrade]);

      const resAdmin = await request(app)
        .get(`/api/v1/boards/${board1.id}/grades`)
        .set('Authorization', `Bearer ${ownSchoolAdminToken}`);
      expect(resAdmin.status).toBe(200);

      const resPrin = await request(app)
        .get(`/api/v1/boards/${board1.id}/grades`)
        .set('Authorization', `Bearer ${ownSchoolPrincipalToken}`);
      expect(resPrin.status).toBe(200);

      const resCT = await request(app)
        .get(`/api/v1/boards/${board1.id}/grades`)
        .set('Authorization', `Bearer ${ownSchoolClassTeacherToken}`);
      expect(resCT.status).toBe(200);
    });

    it('returns 403 for admin from another school', async () => {
      const app = createApp();
      vi.spyOn(boardsRepository, 'findById').mockResolvedValue(board1);

      const res = await request(app)
        .get(`/api/v1/boards/${board1.id}/grades`)
        .set('Authorization', `Bearer ${otherSchoolAdminToken}`);

      expect(res.status).toBe(403);
    });

    it('returns 403 for student', async () => {
      const app = createApp();

      const res = await request(app)
        .get(`/api/v1/boards/${board1.id}/grades`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/v1/grades/:gradeId', () => {
    it('returns grade by ID for super_admin', async () => {
      const app = createApp();
      vi.spyOn(gradesRepository, 'findById').mockResolvedValue(sampleGrade);

      const res = await request(app)
        .get(`/api/v1/grades/${sampleGrade.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      const body = res.body as { data: Grade };
      expect(body.data.id).toBe(sampleGrade.id);
    });

    it('returns grade by ID for own school admin, principal, and class_teacher', async () => {
      const app = createApp();
      vi.spyOn(gradesRepository, 'findById').mockResolvedValue(sampleGrade);

      const resAdmin = await request(app)
        .get(`/api/v1/grades/${sampleGrade.id}`)
        .set('Authorization', `Bearer ${ownSchoolAdminToken}`);
      expect(resAdmin.status).toBe(200);

      const resPrin = await request(app)
        .get(`/api/v1/grades/${sampleGrade.id}`)
        .set('Authorization', `Bearer ${ownSchoolPrincipalToken}`);
      expect(resPrin.status).toBe(200);

      const resCT = await request(app)
        .get(`/api/v1/grades/${sampleGrade.id}`)
        .set('Authorization', `Bearer ${ownSchoolClassTeacherToken}`);
      expect(resCT.status).toBe(200);
    });

    it('returns 403 for admin of another school', async () => {
      const app = createApp();
      vi.spyOn(gradesRepository, 'findById').mockResolvedValue(sampleGrade);

      const res = await request(app)
        .get(`/api/v1/grades/${sampleGrade.id}`)
        .set('Authorization', `Bearer ${otherSchoolAdminToken}`);

      expect(res.status).toBe(403);
    });

    it('returns 404 when grade not found', async () => {
      const app = createApp();
      vi.spyOn(gradesRepository, 'findById').mockResolvedValue(null);

      const res = await request(app)
        .get('/api/v1/grades/99999999-9999-4999-a999-999999999999')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/v1/grades/:gradeId', () => {
    it('updates grade for super_admin and own-school admin', async () => {
      const app = createApp();
      vi.spyOn(gradesRepository, 'findById').mockResolvedValue(sampleGrade);
      vi.spyOn(gradesRepository, 'update').mockResolvedValue({
        ...sampleGrade,
        name: 'Grade 10 - Section A (Updated)',
      });

      const res = await request(app)
        .patch(`/api/v1/grades/${sampleGrade.id}`)
        .set('Authorization', `Bearer ${ownSchoolAdminToken}`)
        .send({ name: 'Grade 10 - Section A (Updated)' });

      expect(res.status).toBe(200);
      const body = res.body as { data: Grade };
      expect(body.data.name).toBe('Grade 10 - Section A (Updated)');
    });

    it('returns 403 for admin from another school', async () => {
      const app = createApp();
      vi.spyOn(gradesRepository, 'findById').mockResolvedValue(sampleGrade);

      const res = await request(app)
        .patch(`/api/v1/grades/${sampleGrade.id}`)
        .set('Authorization', `Bearer ${otherSchoolAdminToken}`)
        .send({ name: 'Hacked' });

      expect(res.status).toBe(403);
    });

    it('returns 403 for principal and class_teacher on update', async () => {
      const app = createApp();

      const resPrin = await request(app)
        .patch(`/api/v1/grades/${sampleGrade.id}`)
        .set('Authorization', `Bearer ${ownSchoolPrincipalToken}`)
        .send({ name: 'Updated' });
      expect(resPrin.status).toBe(403);

      const resCT = await request(app)
        .patch(`/api/v1/grades/${sampleGrade.id}`)
        .set('Authorization', `Bearer ${ownSchoolClassTeacherToken}`)
        .send({ name: 'Updated' });
      expect(resCT.status).toBe(403);
    });
  });

  describe('DELETE /api/v1/grades/:gradeId', () => {
    it('soft deletes grade and returns 204 for own school admin', async () => {
      const app = createApp();
      vi.spyOn(gradesRepository, 'findById').mockResolvedValue(sampleGrade);
      vi.spyOn(gradesRepository, 'softDelete').mockResolvedValue(true);

      const res = await request(app)
        .delete(`/api/v1/grades/${sampleGrade.id}`)
        .set('Authorization', `Bearer ${ownSchoolAdminToken}`);

      expect(res.status).toBe(204);
    });

    it('returns 403 for admin from another school', async () => {
      const app = createApp();
      vi.spyOn(gradesRepository, 'findById').mockResolvedValue(sampleGrade);

      const res = await request(app)
        .delete(`/api/v1/grades/${sampleGrade.id}`)
        .set('Authorization', `Bearer ${otherSchoolAdminToken}`);

      expect(res.status).toBe(403);
    });

    it('returns 404 when grade not found', async () => {
      const app = createApp();
      vi.spyOn(gradesRepository, 'findById').mockResolvedValue(null);

      const res = await request(app)
        .delete('/api/v1/grades/99999999-9999-4999-a999-999999999999')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(404);
    });
  });
});
