import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../../app.js';
import { env } from '../../config/env.js';
import { subjectsRepository, type GradeSubjectItem } from './subjects.repository.js';
import { gradesRepository } from '../grades/grades.repository.js';
import type { Subject, GradeSubject } from '../../db/schema/subjects.js';
import type { Grade } from '../../db/schema/grades.js';
import type { ErrorResponsePayload } from '../../middleware/error-handler.js';

describe('Subjects Module API', () => {
  const school1Id = '11111111-1111-4111-a111-111111111111';
  const school2Id = '22222222-2222-4222-a222-222222222222';

  const sampleGrade: Grade = {
    id: '33333333-3333-4333-a333-333333333333',
    schoolId: school1Id,
    boardId: '44444444-4444-4444-a444-444444444444',
    name: 'Grade 10 - Section A',
    code: 'G10-A',
    gradeNumber: 10,
    section: 'A',
    capacity: 40,
    status: 'active',
    createdAt: new Date('2026-01-01T12:00:00Z'),
    updatedAt: new Date('2026-01-01T12:00:00Z'),
    deletedAt: null,
  };

  const sampleSubject: Subject = {
    id: '55555555-5555-4555-a555-555555555555',
    schoolId: school1Id,
    name: 'Mathematics',
    code: 'MATH',
    description: 'Core Mathematics syllabus',
    status: 'active',
    createdAt: new Date('2026-01-01T12:00:00Z'),
    updatedAt: new Date('2026-01-01T12:00:00Z'),
    deletedAt: null,
  };

  const sampleGradeSubject: GradeSubject = {
    id: '66666666-6666-4666-a666-666666666666',
    schoolId: school1Id,
    gradeId: sampleGrade.id,
    subjectId: sampleSubject.id,
    status: 'active',
    createdAt: new Date('2026-01-01T12:00:00Z'),
    updatedAt: new Date('2026-01-01T12:00:00Z'),
  };

  const sampleGradeSubjectItem: GradeSubjectItem = {
    ...sampleSubject,
    gradeSubjectId: sampleGradeSubject.id,
    gradeSubjectStatus: sampleGradeSubject.status,
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

  const ownSchoolTeacherToken = jwt.sign(
    { sub: 'user-teacher1', role: 'teacher', schoolId: school1Id, jti: 'teacher1-jti' },
    env.JWT_ACCESS_SECRET,
  );

  const studentToken = jwt.sign(
    { sub: 'user-student', role: 'student', schoolId: school1Id, jti: 'stu-jti' },
    env.JWT_ACCESS_SECRET,
  );

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /api/v1/grades/:gradeId/subjects', () => {
    it('creates and assigns a subject to grade (201) for school admin', async () => {
      const app = createApp();
      vi.spyOn(gradesRepository, 'findById').mockResolvedValue(sampleGrade);
      vi.spyOn(subjectsRepository, 'findBySchoolAndCode').mockResolvedValue(null);
      vi.spyOn(subjectsRepository, 'create').mockResolvedValue(sampleSubject);
      vi.spyOn(subjectsRepository, 'findGradeSubject').mockResolvedValue(null);
      vi.spyOn(subjectsRepository, 'assignToGrade').mockResolvedValue(sampleGradeSubject);

      const res = await request(app)
        .post(`/api/v1/grades/${sampleGrade.id}/subjects`)
        .set('Authorization', `Bearer ${ownSchoolAdminToken}`)
        .send({
          name: 'Mathematics',
          code: 'MATH',
          description: 'Core Mathematics syllabus',
        });

      expect(res.status).toBe(201);
      const body = res.body as { data: GradeSubjectItem };
      expect(body.data.id).toBe(sampleSubject.id);
      expect(body.data.gradeSubjectId).toBe(sampleGradeSubject.id);
      expect(body.data.name).toBe(sampleSubject.name);
    });

    it('creates and assigns a subject to grade (201) for super_admin', async () => {
      const app = createApp();
      vi.spyOn(gradesRepository, 'findById').mockResolvedValue(sampleGrade);
      vi.spyOn(subjectsRepository, 'findBySchoolAndCode').mockResolvedValue(null);
      vi.spyOn(subjectsRepository, 'create').mockResolvedValue(sampleSubject);
      vi.spyOn(subjectsRepository, 'findGradeSubject').mockResolvedValue(null);
      vi.spyOn(subjectsRepository, 'assignToGrade').mockResolvedValue(sampleGradeSubject);

      const res = await request(app)
        .post(`/api/v1/grades/${sampleGrade.id}/subjects`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: 'Mathematics',
          code: 'MATH',
          description: 'Core Mathematics syllabus',
        });

      expect(res.status).toBe(201);
      const body = res.body as { data: GradeSubjectItem };
      expect(body.data.id).toBe(sampleSubject.id);
      expect(body.data.gradeSubjectId).toBe(sampleGradeSubject.id);
    });

    it('assigns existing subject by subjectId (201)', async () => {
      const app = createApp();
      vi.spyOn(gradesRepository, 'findById').mockResolvedValue(sampleGrade);
      vi.spyOn(subjectsRepository, 'findById').mockResolvedValue(sampleSubject);
      vi.spyOn(subjectsRepository, 'findGradeSubject').mockResolvedValue(null);
      vi.spyOn(subjectsRepository, 'assignToGrade').mockResolvedValue(sampleGradeSubject);

      const res = await request(app)
        .post(`/api/v1/grades/${sampleGrade.id}/subjects`)
        .set('Authorization', `Bearer ${ownSchoolAdminToken}`)
        .send({
          subjectId: sampleSubject.id,
        });

      expect(res.status).toBe(201);
      const body = res.body as { data: GradeSubjectItem };
      expect(body.data.id).toBe(sampleSubject.id);
      expect(body.data.gradeSubjectId).toBe(sampleGradeSubject.id);
    });

    it('returns 403 when admin from another school tries to assign subject', async () => {
      const app = createApp();
      vi.spyOn(gradesRepository, 'findById').mockResolvedValue(sampleGrade);

      const res = await request(app)
        .post(`/api/v1/grades/${sampleGrade.id}/subjects`)
        .set('Authorization', `Bearer ${otherSchoolAdminToken}`)
        .send({
          name: 'Physics',
          code: 'PHYS',
        });

      expect(res.status).toBe(403);
    });

    it('returns 403 when teacher attempts to assign subject', async () => {
      const app = createApp();

      const res = await request(app)
        .post(`/api/v1/grades/${sampleGrade.id}/subjects`)
        .set('Authorization', `Bearer ${ownSchoolTeacherToken}`)
        .send({
          name: 'Physics',
          code: 'PHYS',
        });

      expect(res.status).toBe(403);
    });

    it('returns 401 without auth header', async () => {
      const app = createApp();

      const res = await request(app)
        .post(`/api/v1/grades/${sampleGrade.id}/subjects`)
        .send({ name: 'Physics', code: 'PHYS' });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/grades/:gradeId/subjects', () => {
    it('returns list of subjects for grade for teacher', async () => {
      const app = createApp();
      vi.spyOn(gradesRepository, 'findById').mockResolvedValue(sampleGrade);
      vi.spyOn(subjectsRepository, 'listSubjectsByGrade').mockResolvedValue([
        sampleGradeSubjectItem,
      ]);

      const res = await request(app)
        .get(`/api/v1/grades/${sampleGrade.id}/subjects`)
        .set('Authorization', `Bearer ${ownSchoolTeacherToken}`);

      expect(res.status).toBe(200);
      const body = res.body as { data: GradeSubjectItem[] };
      expect(body.data).toHaveLength(1);
      expect(body.data[0]?.code).toBe('MATH');
    });

    it('returns 403 for student', async () => {
      const app = createApp();

      const res = await request(app)
        .get(`/api/v1/grades/${sampleGrade.id}/subjects`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
    });

    it('returns 404 if grade does not exist', async () => {
      const app = createApp();
      vi.spyOn(gradesRepository, 'findById').mockResolvedValue(null);

      const res = await request(app)
        .get(`/api/v1/grades/00000000-0000-0000-0000-000000000000/subjects`)
        .set('Authorization', `Bearer ${ownSchoolAdminToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/v1/subjects/:subjectId', () => {
    it('returns subject for authorized teacher', async () => {
      const app = createApp();
      vi.spyOn(subjectsRepository, 'findById').mockResolvedValue(sampleSubject);

      const res = await request(app)
        .get(`/api/v1/subjects/${sampleSubject.id}`)
        .set('Authorization', `Bearer ${ownSchoolTeacherToken}`);

      expect(res.status).toBe(200);
      const body = res.body as { data: Subject };
      expect(body.data.id).toBe(sampleSubject.id);
      expect(body.data.name).toBe(sampleSubject.name);
    });

    it('returns 403 for user from different school', async () => {
      const app = createApp();
      vi.spyOn(subjectsRepository, 'findById').mockResolvedValue(sampleSubject);

      const res = await request(app)
        .get(`/api/v1/subjects/${sampleSubject.id}`)
        .set('Authorization', `Bearer ${otherSchoolAdminToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('PATCH /api/v1/subjects/:subjectId', () => {
    it('updates subject for admin (200)', async () => {
      const app = createApp();
      vi.spyOn(subjectsRepository, 'findById').mockResolvedValue(sampleSubject);
      vi.spyOn(subjectsRepository, 'findBySchoolAndCode').mockResolvedValue(null);
      vi.spyOn(subjectsRepository, 'update').mockResolvedValue({
        ...sampleSubject,
        name: 'Higher Mathematics',
      });

      const res = await request(app)
        .patch(`/api/v1/subjects/${sampleSubject.id}`)
        .set('Authorization', `Bearer ${ownSchoolAdminToken}`)
        .send({
          name: 'Higher Mathematics',
        });

      expect(res.status).toBe(200);
      const body = res.body as { data: Subject };
      expect(body.data.name).toBe('Higher Mathematics');
    });

    it('returns 403 when teacher attempts to update subject', async () => {
      const app = createApp();

      const res = await request(app)
        .patch(`/api/v1/subjects/${sampleSubject.id}`)
        .set('Authorization', `Bearer ${ownSchoolTeacherToken}`)
        .send({ name: 'Higher Mathematics' });

      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/v1/grades/:gradeId/subjects/:subjectId', () => {
    it('unassigns subject from grade (204)', async () => {
      const app = createApp();
      vi.spyOn(gradesRepository, 'findById').mockResolvedValue(sampleGrade);
      vi.spyOn(subjectsRepository, 'findById').mockResolvedValue(sampleSubject);
      vi.spyOn(subjectsRepository, 'findGradeSubject').mockResolvedValue(sampleGradeSubject);
      vi.spyOn(subjectsRepository, 'removeGradeAssignment').mockResolvedValue(1);

      const res = await request(app)
        .delete(`/api/v1/grades/${sampleGrade.id}/subjects/${sampleSubject.id}`)
        .set('Authorization', `Bearer ${ownSchoolAdminToken}`);

      expect(res.status).toBe(204);
    });

    it('returns 404 if assignment does not exist', async () => {
      const app = createApp();
      vi.spyOn(gradesRepository, 'findById').mockResolvedValue(sampleGrade);
      vi.spyOn(subjectsRepository, 'findById').mockResolvedValue(sampleSubject);
      vi.spyOn(subjectsRepository, 'findGradeSubject').mockResolvedValue(null);

      const res = await request(app)
        .delete(`/api/v1/grades/${sampleGrade.id}/subjects/${sampleSubject.id}`)
        .set('Authorization', `Bearer ${ownSchoolAdminToken}`);

      expect(res.status).toBe(404);
      const body = res.body as ErrorResponsePayload;
      expect(body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('DELETE /api/v1/subjects/:subjectId', () => {
    it('soft deletes catalog subject (204) for admin', async () => {
      const app = createApp();
      vi.spyOn(subjectsRepository, 'findById').mockResolvedValue(sampleSubject);
      vi.spyOn(subjectsRepository, 'softDelete').mockResolvedValue(sampleSubject);
      vi.spyOn(subjectsRepository, 'cascadeRemoveGradeAssignments').mockResolvedValue(1);

      const res = await request(app)
        .delete(`/api/v1/subjects/${sampleSubject.id}`)
        .set('Authorization', `Bearer ${ownSchoolAdminToken}`);

      expect(res.status).toBe(204);
    });

    it('returns 403 for principal attempting to delete catalog subject', async () => {
      const app = createApp();

      const res = await request(app)
        .delete(`/api/v1/subjects/${sampleSubject.id}`)
        .set('Authorization', `Bearer ${ownSchoolPrincipalToken}`);

      expect(res.status).toBe(403);
    });
  });
});
