import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../../../app.js';
import { env } from '../../../config/env.js';
import { materialsRepository } from './materials.repository.js';
import { chaptersRepository } from '../chapters.repository.js';
import { teachersRepository } from '../../teachers/teachers.repository.js';
import type { ChapterMaterial } from '../../../db/schema/chapter-materials.js';
import type { Chapter } from '../../../db/schema/chapters.js';
import type { Teacher } from '../../../db/schema/teachers.js';

describe('Chapter Materials API', () => {
  const school1Id = '11111111-1111-4111-a111-111111111111';
  const school2Id = '22222222-2222-4222-a222-222222222222';
  const chapterId = '33333333-3333-4333-a333-333333333333';
  const subjectId = '44444444-4444-4444-a444-444444444444';
  const teacherId = '55555555-5555-4555-a555-555555555555';
  const teacherUserId = '66666666-6666-4666-a666-666666666666';

  const mockChapter: Chapter = {
    id: chapterId,
    schoolId: school1Id,
    subjectId,
    chapterNumber: 1,
    title: 'Algebra Foundations',
    description: 'Intro to algebra',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockTeacher: Teacher = {
    id: teacherId,
    schoolId: school1Id,
    userId: teacherUserId,
    employeeId: 'EMP-001',
    firstName: 'Edna',
    lastName: 'Krabappel',
    email: 'edna@springfield.edu',
    phone: null,
    joiningDate: null,
    qualification: null,
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockMaterial: ChapterMaterial = {
    id: '77777777-7777-4777-a777-777777777777',
    schoolId: school1Id,
    chapterId,
    subjectId,
    teacherId,
    title: 'Worksheet 1',
    description: 'Practice problems',
    materialType: 'worksheet',
    fileUrl: '/uploads/ws1.pdf',
    fileName: 'ws1.pdf',
    fileSize: 2048,
    mimeType: 'application/pdf',
    externalUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const teacherToken = jwt.sign(
    { sub: teacherUserId, role: 'teacher', schoolId: school1Id, jti: 'teach-jti' },
    env.JWT_ACCESS_SECRET,
  );

  const studentToken = jwt.sign(
    { sub: 'student-id', role: 'student', schoolId: school1Id, jti: 'stu-jti' },
    env.JWT_ACCESS_SECRET,
  );

  const _adminToken = jwt.sign(
    { sub: 'admin-id', role: 'admin', schoolId: school1Id, jti: 'adm-jti' },
    env.JWT_ACCESS_SECRET,
  );

  const _otherSchoolTeacherToken = jwt.sign(
    { sub: 'other-teach', role: 'teacher', schoolId: school2Id, jti: 'oth-jti' },
    env.JWT_ACCESS_SECRET,
  );

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /api/v1/chapters/:chapterId/materials', () => {
    it('creates material for assigned teacher (201)', async () => {
      const app = createApp();
      vi.spyOn(chaptersRepository, 'findById').mockResolvedValue(mockChapter);
      vi.spyOn(teachersRepository, 'findByUserId').mockResolvedValue(mockTeacher);
      vi.spyOn(teachersRepository, 'hasTeacherSubjectAssignment').mockResolvedValue(true);
      vi.spyOn(materialsRepository, 'create').mockResolvedValue(mockMaterial);

      const res = await request(app)
        .post(`/api/v1/chapters/${chapterId}/materials`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          title: 'Worksheet 1',
          description: 'Practice problems',
          materialType: 'worksheet',
          fileUrl: '/uploads/ws1.pdf',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBe(mockMaterial.id);
    });

    it('returns 403 when teacher does not teach this chapter subject', async () => {
      const app = createApp();
      vi.spyOn(chaptersRepository, 'findById').mockResolvedValue(mockChapter);
      vi.spyOn(teachersRepository, 'findByUserId').mockResolvedValue(mockTeacher);
      vi.spyOn(teachersRepository, 'hasTeacherSubjectAssignment').mockResolvedValue(false);

      const res = await request(app)
        .post(`/api/v1/chapters/${chapterId}/materials`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          title: 'Worksheet 1',
          materialType: 'video_link',
          externalUrl: 'https://youtube.com/watch?v=abc',
        });

      expect(res.status).toBe(403);
    });

    it('returns 403 for student attempting to upload material', async () => {
      const app = createApp();

      const res = await request(app)
        .post(`/api/v1/chapters/${chapterId}/materials`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          title: 'Worksheet 1',
          materialType: 'video_link',
          externalUrl: 'https://youtube.com/watch?v=abc',
        });

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/v1/chapters/:chapterId/materials', () => {
    it('returns list of materials for student (200)', async () => {
      const app = createApp();
      vi.spyOn(chaptersRepository, 'findById').mockResolvedValue(mockChapter);
      vi.spyOn(materialsRepository, 'listByChapter').mockResolvedValue([mockMaterial]);

      const res = await request(app)
        .get(`/api/v1/chapters/${chapterId}/materials`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe(mockMaterial.id);
    });
  });

  describe('GET /api/v1/chapters/:chapterId/materials/:materialId', () => {
    it('returns material by ID (200)', async () => {
      const app = createApp();
      vi.spyOn(chaptersRepository, 'findById').mockResolvedValue(mockChapter);
      vi.spyOn(materialsRepository, 'findById').mockResolvedValue(mockMaterial);

      const res = await request(app)
        .get(`/api/v1/chapters/${chapterId}/materials/${mockMaterial.id}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(mockMaterial.id);
    });
  });

  describe('DELETE /api/v1/chapters/:chapterId/materials/:materialId', () => {
    it('allows author teacher to delete material (204)', async () => {
      const app = createApp();
      vi.spyOn(chaptersRepository, 'findById').mockResolvedValue(mockChapter);
      vi.spyOn(materialsRepository, 'findById').mockResolvedValue(mockMaterial);
      vi.spyOn(teachersRepository, 'findByUserId').mockResolvedValue(mockTeacher);
      vi.spyOn(materialsRepository, 'softDelete').mockResolvedValue(true);

      const res = await request(app)
        .delete(`/api/v1/chapters/${chapterId}/materials/${mockMaterial.id}`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.status).toBe(204);
    });

    it('returns 403 when different teacher tries to delete material', async () => {
      const app = createApp();
      vi.spyOn(chaptersRepository, 'findById').mockResolvedValue(mockChapter);
      vi.spyOn(materialsRepository, 'findById').mockResolvedValue(mockMaterial);
      vi.spyOn(teachersRepository, 'findByUserId').mockResolvedValue({
        ...mockTeacher,
        id: 'other-teacher-id',
      });

      const res = await request(app)
        .delete(`/api/v1/chapters/${chapterId}/materials/${mockMaterial.id}`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.status).toBe(403);
    });
  });
});
