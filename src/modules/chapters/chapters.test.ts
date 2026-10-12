import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../../app.js';
import { env } from '../../config/env.js';
import { chaptersRepository } from './chapters.repository.js';
import { subjectsRepository } from '../subjects/subjects.repository.js';
import { auditLogsRepository } from '../audit-logs/audit-logs.repository.js';
import type { Chapter } from '../../db/schema/chapters.js';
import type { Subject } from '../../db/schema/subjects.js';
import type { ErrorResponsePayload } from '../../middleware/error-handler.js';

describe('Chapters Module API', () => {
  const school1Id = '11111111-1111-4111-a111-111111111111';
  const school2Id = '22222222-2222-4222-a222-222222222222';

  const sampleSubject: Subject = {
    id: '33333333-3333-4333-a333-333333333333',
    schoolId: school1Id,
    name: 'Mathematics',
    code: 'MATH',
    description: 'Core Mathematics syllabus',
    status: 'active',
    createdAt: new Date('2026-01-01T12:00:00Z'),
    updatedAt: new Date('2026-01-01T12:00:00Z'),
    deletedAt: null,
  };

  const sampleChapter: Chapter = {
    id: '44444444-4444-4444-a444-444444444444',
    schoolId: school1Id,
    subjectId: sampleSubject.id,
    chapterNumber: 1,
    title: 'Algebra Foundations',
    description: 'Variables, expressions and equations',
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

  const teacherToken = jwt.sign(
    { sub: 'user-teach', role: 'teacher', schoolId: school1Id, jti: 'teach-jti' },
    env.JWT_ACCESS_SECRET,
  );

  const studentToken = jwt.sign(
    { sub: 'user-stu', role: 'student', schoolId: school1Id, jti: 'stu-jti' },
    env.JWT_ACCESS_SECRET,
  );

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(auditLogsRepository, 'create').mockResolvedValue({} as never);
  });

  describe('POST /api/v1/subjects/:subjectId/chapters', () => {
    it('creates a chapter successfully for school admin (201)', async () => {
      const app = createApp();
      vi.spyOn(subjectsRepository, 'findById').mockResolvedValue(sampleSubject);
      vi.spyOn(chaptersRepository, 'findBySubjectAndNumber').mockResolvedValue(null);
      vi.spyOn(chaptersRepository, 'create').mockResolvedValue(sampleChapter);

      const res = await request(app)
        .post(`/api/v1/subjects/${sampleSubject.id}/chapters`)
        .set('Authorization', `Bearer ${ownSchoolAdminToken}`)
        .send({
          chapterNumber: 1,
          title: 'Algebra Foundations',
          description: 'Variables, expressions and equations',
          status: 'active',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBe(sampleChapter.id);
      expect(res.body.data.chapterNumber).toBe(1);
    });

    it('rejects creation for teacher role with 403 Forbidden', async () => {
      const app = createApp();
      const res = await request(app)
        .post(`/api/v1/subjects/${sampleSubject.id}/chapters`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          chapterNumber: 1,
          title: 'Algebra Foundations',
        });

      expect(res.status).toBe(403);
    });

    it('rejects without authorization with 401 Unauthorized', async () => {
      const app = createApp();
      const res = await request(app).post(`/api/v1/subjects/${sampleSubject.id}/chapters`).send({
        chapterNumber: 1,
        title: 'Algebra Foundations',
      });

      expect(res.status).toBe(401);
    });

    it('returns 409 Conflict if chapterNumber already exists in subject', async () => {
      const app = createApp();
      vi.spyOn(subjectsRepository, 'findById').mockResolvedValue(sampleSubject);
      vi.spyOn(chaptersRepository, 'findBySubjectAndNumber').mockResolvedValue(sampleChapter);

      const res = await request(app)
        .post(`/api/v1/subjects/${sampleSubject.id}/chapters`)
        .set('Authorization', `Bearer ${ownSchoolAdminToken}`)
        .send({
          chapterNumber: 1,
          title: 'Algebra Foundations',
        });

      expect(res.status).toBe(409);
      const err = res.body as ErrorResponsePayload;
      expect(err.error.code).toBe('CONFLICT');
    });

    it('returns 403 if admin from other school attempts creation', async () => {
      const app = createApp();
      vi.spyOn(subjectsRepository, 'findById').mockResolvedValue(sampleSubject);

      const res = await request(app)
        .post(`/api/v1/subjects/${sampleSubject.id}/chapters`)
        .set('Authorization', `Bearer ${otherSchoolAdminToken}`)
        .send({
          chapterNumber: 1,
          title: 'Algebra Foundations',
        });

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/v1/subjects/:subjectId/chapters', () => {
    it('returns paginated chapters under a subject (200)', async () => {
      const app = createApp();
      vi.spyOn(subjectsRepository, 'findById').mockResolvedValue(sampleSubject);
      vi.spyOn(chaptersRepository, 'listBySubject').mockResolvedValue([sampleChapter]);

      const res = await request(app)
        .get(`/api/v1/subjects/${sampleSubject.id}/chapters`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe(sampleChapter.id);
    });

    it('returns 404 if subject is not found', async () => {
      const app = createApp();
      vi.spyOn(subjectsRepository, 'findById').mockResolvedValue(null);

      const res = await request(app)
        .get(`/api/v1/subjects/${sampleSubject.id}/chapters`)
        .set('Authorization', `Bearer ${ownSchoolAdminToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/v1/chapters/:chapterId', () => {
    it('returns chapter details for authorized user (200)', async () => {
      const app = createApp();
      vi.spyOn(chaptersRepository, 'findById').mockResolvedValue(sampleChapter);

      const res = await request(app)
        .get(`/api/v1/chapters/${sampleChapter.id}`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(sampleChapter.id);
      expect(res.body.data.title).toBe(sampleChapter.title);
    });

    it('returns 403 for cross-school chapter access', async () => {
      const app = createApp();
      vi.spyOn(chaptersRepository, 'findById').mockResolvedValue(sampleChapter);

      const res = await request(app)
        .get(`/api/v1/chapters/${sampleChapter.id}`)
        .set('Authorization', `Bearer ${otherSchoolAdminToken}`);

      expect(res.status).toBe(403);
    });

    it('returns 404 if chapter is not found', async () => {
      const app = createApp();
      vi.spyOn(chaptersRepository, 'findById').mockResolvedValue(null);

      const res = await request(app)
        .get(`/api/v1/chapters/${sampleChapter.id}`)
        .set('Authorization', `Bearer ${ownSchoolAdminToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/v1/chapters/:chapterId', () => {
    it('updates chapter details successfully (200)', async () => {
      const app = createApp();
      vi.spyOn(chaptersRepository, 'findById').mockResolvedValue(sampleChapter);
      vi.spyOn(chaptersRepository, 'update').mockResolvedValue({
        ...sampleChapter,
        title: 'Updated Title',
      });

      const res = await request(app)
        .patch(`/api/v1/chapters/${sampleChapter.id}`)
        .set('Authorization', `Bearer ${ownSchoolAdminToken}`)
        .send({ title: 'Updated Title' });

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('Updated Title');
    });

    it('returns 403 if student attempts update', async () => {
      const app = createApp();
      const res = await request(app)
        .patch(`/api/v1/chapters/${sampleChapter.id}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ title: 'Updated Title' });

      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/v1/chapters/:chapterId', () => {
    it('soft deletes chapter (204)', async () => {
      const app = createApp();
      vi.spyOn(chaptersRepository, 'findById').mockResolvedValue(sampleChapter);
      vi.spyOn(chaptersRepository, 'softDelete').mockResolvedValue(true);

      const res = await request(app)
        .delete(`/api/v1/chapters/${sampleChapter.id}`)
        .set('Authorization', `Bearer ${ownSchoolAdminToken}`);

      expect(res.status).toBe(204);
    });

    it('allows super_admin to delete chapter (204)', async () => {
      const app = createApp();
      vi.spyOn(chaptersRepository, 'findById').mockResolvedValue(sampleChapter);
      vi.spyOn(chaptersRepository, 'softDelete').mockResolvedValue(true);

      const res = await request(app)
        .delete(`/api/v1/chapters/${sampleChapter.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(204);
    });
  });

  describe('PATCH /api/v1/subjects/:subjectId/chapters/reorder', () => {
    it('reorders chapters under a subject successfully (200)', async () => {
      const app = createApp();
      vi.spyOn(subjectsRepository, 'findById').mockResolvedValue(sampleSubject);
      vi.spyOn(chaptersRepository, 'findById').mockResolvedValue(sampleChapter);
      vi.spyOn(chaptersRepository, 'reorder').mockResolvedValue([sampleChapter]);

      const res = await request(app)
        .patch(`/api/v1/subjects/${sampleSubject.id}/chapters/reorder`)
        .set('Authorization', `Bearer ${ownSchoolAdminToken}`)
        .send({
          chapters: [{ id: sampleChapter.id, chapterNumber: 1 }],
        });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });
  });
});
