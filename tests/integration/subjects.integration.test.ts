import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../../src/app.js';
import { env } from '../../src/config/env.js';
import { gradesRepository } from '../../src/modules/grades/grades.repository.js';
import { subjectsRepository } from '../../src/modules/subjects/subjects.repository.js';
import { teacherAssignmentsRepository } from '../../src/modules/teacher-assignments/teacher-assignments.repository.js';
import type { Grade } from '../../src/db/schema/grades.js';
import type { Subject, GradeSubject } from '../../src/db/schema/subjects.js';

describe('Subjects Integration Tests', () => {
  const app = createApp();

  const schoolAId = '11111111-1111-4111-8111-111111111111';
  const schoolBId = '22222222-2222-4222-8222-222222222222';

  const gradeA: Grade = {
    id: '55555555-5555-4555-8555-555555555555',
    schoolId: schoolAId,
    boardId: '33333333-3333-4333-8333-333333333333',
    name: 'Grade 5 Section A',
    code: 'G5-A',
    gradeNumber: 5,
    section: 'A',
    capacity: 35,
    classTeacherId: null,
    status: 'active',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    deletedAt: null,
  };

  const subjectA: Subject = {
    id: '88888888-8888-4888-8888-888888888888',
    schoolId: schoolAId,
    name: 'Mathematics',
    code: 'MATH',
    description: 'Core mathematics',
    status: 'active',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    deletedAt: null,
  };

  const subjectB: Subject = {
    id: '99999999-9999-4999-8999-999999999999',
    schoolId: schoolBId,
    name: 'Physics',
    code: 'PHYS',
    description: 'School B physics',
    status: 'active',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    deletedAt: null,
  };

  const gradeSubjectA: GradeSubject = {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    schoolId: schoolAId,
    gradeId: gradeA.id,
    subjectId: subjectA.id,
    status: 'active',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  };

  const schoolAdminToken = jwt.sign(
    { sub: 'user-admin-a', role: 'admin', schoolId: schoolAId, jti: 'admin-a-jti' },
    env.JWT_ACCESS_SECRET,
  );

  const otherSchoolAdminToken = jwt.sign(
    { sub: 'user-admin-b', role: 'admin', schoolId: schoolBId, jti: 'admin-b-jti' },
    env.JWT_ACCESS_SECRET,
  );

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Grade-Subject Association', () => {
    it('creates and assigns new subject to grade (201)', async () => {
      vi.spyOn(gradesRepository, 'findById').mockResolvedValue(gradeA);
      vi.spyOn(subjectsRepository, 'findBySchoolAndCode').mockResolvedValue(null);
      vi.spyOn(subjectsRepository, 'create').mockResolvedValue(subjectA);
      vi.spyOn(subjectsRepository, 'findGradeSubject').mockResolvedValue(null);
      vi.spyOn(subjectsRepository, 'assignToGrade').mockResolvedValue(gradeSubjectA);

      const res = await request(app)
        .post(`/api/v1/grades/${gradeA.id}/subjects`)
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          name: 'Mathematics',
          code: 'MATH',
        });

      expect(res.status).toBe(201);
      expect((res.body as { data: { gradeSubjectId: string } }).data.gradeSubjectId).toBe(
        gradeSubjectA.id,
      );
    });

    it('assigns existing subject by subjectId (201)', async () => {
      vi.spyOn(gradesRepository, 'findById').mockResolvedValue(gradeA);
      vi.spyOn(subjectsRepository, 'findById').mockResolvedValue(subjectA);
      vi.spyOn(subjectsRepository, 'findGradeSubject').mockResolvedValue(null);
      vi.spyOn(subjectsRepository, 'assignToGrade').mockResolvedValue(gradeSubjectA);

      const res = await request(app)
        .post(`/api/v1/grades/${gradeA.id}/subjects`)
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          subjectId: subjectA.id,
        });

      expect(res.status).toBe(201);
    });

    it('rejects duplicate assignment of same subject to grade (409 Conflict)', async () => {
      vi.spyOn(gradesRepository, 'findById').mockResolvedValue(gradeA);
      vi.spyOn(subjectsRepository, 'findById').mockResolvedValue(subjectA);
      vi.spyOn(subjectsRepository, 'findGradeSubject').mockResolvedValue(gradeSubjectA);

      const res = await request(app)
        .post(`/api/v1/grades/${gradeA.id}/subjects`)
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          subjectId: subjectA.id,
        });

      expect(res.status).toBe(409);
    });

    it('forbids assigning subject from another school to grade (403 Forbidden)', async () => {
      vi.spyOn(gradesRepository, 'findById').mockResolvedValue(gradeA);
      vi.spyOn(subjectsRepository, 'findById').mockResolvedValue(subjectB);

      const res = await request(app)
        .post(`/api/v1/grades/${gradeA.id}/subjects`)
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          subjectId: subjectB.id,
        });

      expect(res.status).toBe(403);
    });

    it('denies school admin from another school from listing subjects in grade (403 Forbidden)', async () => {
      vi.spyOn(gradesRepository, 'findById').mockResolvedValue(gradeA);

      const res = await request(app)
        .get(`/api/v1/grades/${gradeA.id}/subjects`)
        .set('Authorization', `Bearer ${otherSchoolAdminToken}`);

      expect(res.status).toBe(403);
    });

    it('removes subject assignment from grade (204)', async () => {
      vi.spyOn(gradesRepository, 'findById').mockResolvedValue(gradeA);
      vi.spyOn(subjectsRepository, 'findById').mockResolvedValue(subjectA);
      vi.spyOn(subjectsRepository, 'findGradeSubject').mockResolvedValue(gradeSubjectA);
      vi.spyOn(subjectsRepository, 'removeGradeAssignment').mockResolvedValue(true);

      const res = await request(app)
        .delete(`/api/v1/grades/${gradeA.id}/subjects/${subjectA.id}`)
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      expect(res.status).toBe(204);
    });
  });

  describe('Master Subject Soft-Delete Guards', () => {
    it('rejects deletion when active teacher assignments exist (409 Conflict)', async () => {
      vi.spyOn(subjectsRepository, 'findById').mockResolvedValue(subjectA);
      vi.spyOn(teacherAssignmentsRepository, 'hasActiveAssignmentsBySubject').mockResolvedValue(
        true,
      );

      const res = await request(app)
        .delete(`/api/v1/subjects/${subjectA.id}`)
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      expect(res.status).toBe(409);
    });

    it('rejects deletion when active grade assignments exist (409 Conflict)', async () => {
      vi.spyOn(subjectsRepository, 'findById').mockResolvedValue(subjectA);
      vi.spyOn(teacherAssignmentsRepository, 'hasActiveAssignmentsBySubject').mockResolvedValue(
        false,
      );
      vi.spyOn(subjectsRepository, 'hasActiveGradeSubjects').mockResolvedValue(true);

      const res = await request(app)
        .delete(`/api/v1/subjects/${subjectA.id}`)
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      expect(res.status).toBe(409);
    });

    it('allows soft-delete and cascades when unassigned (204)', async () => {
      vi.spyOn(subjectsRepository, 'findById').mockResolvedValue(subjectA);
      vi.spyOn(teacherAssignmentsRepository, 'hasActiveAssignmentsBySubject').mockResolvedValue(
        false,
      );
      vi.spyOn(subjectsRepository, 'hasActiveGradeSubjects').mockResolvedValue(false);
      vi.spyOn(subjectsRepository, 'softDelete').mockResolvedValue(true);
      vi.spyOn(subjectsRepository, 'cascadeRemoveGradeAssignments').mockResolvedValue(0);

      const res = await request(app)
        .delete(`/api/v1/subjects/${subjectA.id}`)
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      expect(res.status).toBe(204);
    });
  });
});
