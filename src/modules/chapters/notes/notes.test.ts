import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../../../app.js';
import { env } from '../../../config/env.js';
import { notesRepository } from './notes.repository.js';
import { chaptersRepository } from '../chapters.repository.js';
import { teachersRepository } from '../../teachers/teachers.repository.js';
import type { ChapterNote } from '../../../db/schema/chapter-notes.js';
import type { Chapter } from '../../../db/schema/chapters.js';
import type { Teacher } from '../../../db/schema/teachers.js';

describe('Chapter Notes API', () => {
  const school1Id = '11111111-1111-4111-a111-111111111111';
  const _school2Id = '22222222-2222-4222-a222-222222222222';
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

  const mockPublishedNote: ChapterNote = {
    id: '88888888-8888-4888-a888-888888888888',
    schoolId: school1Id,
    chapterId,
    subjectId,
    teacherId,
    title: 'Revision Summary',
    content: 'Review notes',
    noteType: 'revision_summary',
    fileUrl: null,
    fileName: null,
    fileSize: null,
    mimeType: null,
    isPublished: true,
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

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /api/v1/chapters/:chapterId/notes', () => {
    it('creates note for assigned teacher (201)', async () => {
      const app = createApp();
      vi.spyOn(chaptersRepository, 'findById').mockResolvedValue(mockChapter);
      vi.spyOn(teachersRepository, 'findByUserId').mockResolvedValue(mockTeacher);
      vi.spyOn(teachersRepository, 'hasTeacherSubjectAssignment').mockResolvedValue(true);
      vi.spyOn(notesRepository, 'create').mockResolvedValue(mockPublishedNote);

      const res = await request(app)
        .post(`/api/v1/chapters/${chapterId}/notes`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          title: 'Revision Summary',
          content: 'Review notes',
          noteType: 'revision_summary',
          isPublished: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBe(mockPublishedNote.id);
    });

    it('returns 403 for student attempting to create note', async () => {
      const app = createApp();

      const res = await request(app)
        .post(`/api/v1/chapters/${chapterId}/notes`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          title: 'Student Note',
          noteType: 'lecture_note',
        });

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/v1/chapters/:chapterId/notes', () => {
    it('returns notes for chapter (200)', async () => {
      const app = createApp();
      vi.spyOn(chaptersRepository, 'findById').mockResolvedValue(mockChapter);
      vi.spyOn(notesRepository, 'listByChapter').mockResolvedValue([mockPublishedNote]);

      const res = await request(app)
        .get(`/api/v1/chapters/${chapterId}/notes`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe(mockPublishedNote.id);
    });
  });

  describe('PATCH /api/v1/chapters/:chapterId/notes/:noteId', () => {
    it('updates note by author teacher (200)', async () => {
      const app = createApp();
      vi.spyOn(chaptersRepository, 'findById').mockResolvedValue(mockChapter);
      vi.spyOn(notesRepository, 'findById').mockResolvedValue(mockPublishedNote);
      vi.spyOn(teachersRepository, 'findByUserId').mockResolvedValue(mockTeacher);
      vi.spyOn(notesRepository, 'update').mockResolvedValue({
        ...mockPublishedNote,
        title: 'Updated Revision Summary',
      });

      const res = await request(app)
        .patch(`/api/v1/chapters/${chapterId}/notes/${mockPublishedNote.id}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          title: 'Updated Revision Summary',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('Updated Revision Summary');
    });
  });

  describe('DELETE /api/v1/chapters/:chapterId/notes/:noteId', () => {
    it('soft deletes note by author teacher (204)', async () => {
      const app = createApp();
      vi.spyOn(chaptersRepository, 'findById').mockResolvedValue(mockChapter);
      vi.spyOn(notesRepository, 'findById').mockResolvedValue(mockPublishedNote);
      vi.spyOn(teachersRepository, 'findByUserId').mockResolvedValue(mockTeacher);
      vi.spyOn(notesRepository, 'softDelete').mockResolvedValue(true);

      const res = await request(app)
        .delete(`/api/v1/chapters/${chapterId}/notes/${mockPublishedNote.id}`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.status).toBe(204);
    });
  });
});
