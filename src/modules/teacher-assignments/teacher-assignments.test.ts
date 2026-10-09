import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../../app.js';
import { env } from '../../config/env.js';
import { teacherAssignmentsRepository } from './teacher-assignments.repository.js';
import { teachersRepository } from '../teachers/teachers.repository.js';
import { gradesRepository } from '../grades/grades.repository.js';
import { subjectsRepository } from '../subjects/subjects.repository.js';
import type { TeacherAssignment } from '../../db/schema/teacher-assignments.js';
import type { Teacher } from '../../db/schema/teachers.js';
import type { Grade } from '../../db/schema/grades.js';
import type { Subject, GradeSubject } from '../../db/schema/subjects.js';
import type { ErrorResponsePayload } from '../../middleware/error-handler.js';

describe('Teacher Assignments Module API', () => {
  const school1Id = '11111111-1111-4111-a111-111111111111';
  const school2Id = '22222222-2222-4222-a222-222222222222';
  const teacherId = '33333333-3333-4333-a333-333333333333';
  const gradeId = '44444444-4444-4444-a444-444444444444';
  const subjectId = '55555555-5555-4555-a555-555555555555';
  const assignmentId = '66666666-6666-4666-a666-666666666666';

  const sampleTeacher: Teacher = {
    id: teacherId,
    schoolId: school1Id,
    userId: null,
    employeeId: 'EMP-001',
    firstName: 'Edna',
    lastName: 'Krabappel',
    email: 'edna@springfield.edu',
    phone: null,
    joiningDate: new Date('2025-08-01T00:00:00Z'),
    qualification: 'M.Ed.',
    status: 'active',
    createdAt: new Date('2026-01-01T12:00:00Z'),
    updatedAt: new Date('2026-01-01T12:00:00Z'),
    deletedAt: null,
  };

  const sampleGrade: Grade = {
    id: gradeId,
    schoolId: school1Id,
    boardId: '77777777-7777-4777-a777-777777777777',
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

  const sampleSubject: Subject = {
    id: subjectId,
    schoolId: school1Id,
    name: 'Mathematics',
    code: 'MATH',
    description: null,
    status: 'active',
    createdAt: new Date('2026-01-01T12:00:00Z'),
    updatedAt: new Date('2026-01-01T12:00:00Z'),
    deletedAt: null,
  };

  const sampleGradeSubject: GradeSubject = {
    id: '88888888-8888-4888-a888-888888888888',
    schoolId: school1Id,
    gradeId,
    subjectId,
    status: 'active',
    createdAt: new Date('2026-01-01T12:00:00Z'),
    updatedAt: new Date('2026-01-01T12:00:00Z'),
  };

  const sampleAssignment: TeacherAssignment = {
    id: assignmentId,
    schoolId: school1Id,
    teacherId,
    gradeId,
    subjectId,
    assignedBy: null,
    status: 'active',
    effectiveDate: new Date('2026-02-01T00:00:00Z'),
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

  describe('POST /api/v1/teacher-assignments', () => {
    it('creates a teacher assignment (201) for school admin', async () => {
      const app = createApp();
      vi.spyOn(teachersRepository, 'findById').mockResolvedValue(sampleTeacher);
      vi.spyOn(gradesRepository, 'findById').mockResolvedValue(sampleGrade);
      vi.spyOn(subjectsRepository, 'findById').mockResolvedValue(sampleSubject);
      vi.spyOn(subjectsRepository, 'findGradeSubject').mockResolvedValue(sampleGradeSubject);
      vi.spyOn(teacherAssignmentsRepository, 'findByTeacherGradeSubject').mockResolvedValue(null);
      vi.spyOn(teacherAssignmentsRepository, 'create').mockResolvedValue(sampleAssignment);

      const res = await request(app)
        .post('/api/v1/teacher-assignments')
        .set('Authorization', `Bearer ${ownSchoolAdminToken}`)
        .send({
          teacherId,
          gradeId,
          subjectId,
          status: 'active',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBe(assignmentId);
    });

    it('rejects duplicate assignment (409)', async () => {
      const app = createApp();
      vi.spyOn(teachersRepository, 'findById').mockResolvedValue(sampleTeacher);
      vi.spyOn(gradesRepository, 'findById').mockResolvedValue(sampleGrade);
      vi.spyOn(subjectsRepository, 'findById').mockResolvedValue(sampleSubject);
      vi.spyOn(subjectsRepository, 'findGradeSubject').mockResolvedValue(sampleGradeSubject);
      vi.spyOn(teacherAssignmentsRepository, 'findByTeacherGradeSubject').mockResolvedValue(
        sampleAssignment,
      );

      const res = await request(app)
        .post('/api/v1/teacher-assignments')
        .set('Authorization', `Bearer ${ownSchoolAdminToken}`)
        .send({ teacherId, gradeId, subjectId });

      expect(res.status).toBe(409);
      expect((res.body as ErrorResponsePayload).error.code).toBe('CONFLICT');
    });

    it('rejects if subject not assigned to grade (400)', async () => {
      const app = createApp();
      vi.spyOn(teachersRepository, 'findById').mockResolvedValue(sampleTeacher);
      vi.spyOn(gradesRepository, 'findById').mockResolvedValue(sampleGrade);
      vi.spyOn(subjectsRepository, 'findById').mockResolvedValue(sampleSubject);
      vi.spyOn(subjectsRepository, 'findGradeSubject').mockResolvedValue(null);

      const res = await request(app)
        .post('/api/v1/teacher-assignments')
        .set('Authorization', `Bearer ${ownSchoolAdminToken}`)
        .send({ teacherId, gradeId, subjectId });

      expect(res.status).toBe(400);
      expect((res.body as ErrorResponsePayload).error.code).toBe('BAD_REQUEST');
    });

    it('rejects if admin from another school (403)', async () => {
      const app = createApp();
      vi.spyOn(teachersRepository, 'findById').mockResolvedValue(sampleTeacher);
      vi.spyOn(gradesRepository, 'findById').mockResolvedValue(sampleGrade);
      vi.spyOn(subjectsRepository, 'findById').mockResolvedValue(sampleSubject);

      const res = await request(app)
        .post('/api/v1/teacher-assignments')
        .set('Authorization', `Bearer ${otherSchoolAdminToken}`)
        .send({ teacherId, gradeId, subjectId });

      expect(res.status).toBe(403);
    });

    it('rejects unauthorized roles like student or teacher (403)', async () => {
      const app = createApp();
      const res = await request(app)
        .post('/api/v1/teacher-assignments')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ teacherId, gradeId, subjectId });

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/v1/teacher-assignments', () => {
    it('returns paginated assignments for own school admin (200)', async () => {
      const app = createApp();
      vi.spyOn(teacherAssignmentsRepository, 'list').mockResolvedValue([sampleAssignment]);

      const res = await request(app)
        .get('/api/v1/teacher-assignments')
        .set('Authorization', `Bearer ${ownSchoolAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.pageInfo).toBeDefined();
    });

    it('allows principal to view assignments (200)', async () => {
      const app = createApp();
      vi.spyOn(teacherAssignmentsRepository, 'list').mockResolvedValue([sampleAssignment]);

      const res = await request(app)
        .get('/api/v1/teacher-assignments')
        .set('Authorization', `Bearer ${ownSchoolPrincipalToken}`);

      expect(res.status).toBe(200);
    });

    it('rejects other school admin trying to view school 1 (403)', async () => {
      const app = createApp();
      const res = await request(app)
        .get(`/api/v1/teacher-assignments?schoolId=${school1Id}`)
        .set('Authorization', `Bearer ${otherSchoolAdminToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/v1/teacher-assignments/:assignmentId', () => {
    it('returns assignment details for school staff (200)', async () => {
      const app = createApp();
      vi.spyOn(teacherAssignmentsRepository, 'findById').mockResolvedValue(sampleAssignment);

      const res = await request(app)
        .get(`/api/v1/teacher-assignments/${assignmentId}`)
        .set('Authorization', `Bearer ${ownSchoolTeacherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(assignmentId);
    });

    it('rejects other school admin (403)', async () => {
      const app = createApp();
      vi.spyOn(teacherAssignmentsRepository, 'findById').mockResolvedValue(sampleAssignment);

      const res = await request(app)
        .get(`/api/v1/teacher-assignments/${assignmentId}`)
        .set('Authorization', `Bearer ${otherSchoolAdminToken}`);

      expect(res.status).toBe(403);
    });

    it('returns 404 if assignment not found', async () => {
      const app = createApp();
      vi.spyOn(teacherAssignmentsRepository, 'findById').mockResolvedValue(null);

      const res = await request(app)
        .get(`/api/v1/teacher-assignments/${assignmentId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/v1/teachers/:teacherId/assignments', () => {
    it('returns assignments for a teacher (200)', async () => {
      const app = createApp();
      vi.spyOn(teachersRepository, 'findById').mockResolvedValue(sampleTeacher);
      vi.spyOn(teacherAssignmentsRepository, 'listByTeacher').mockResolvedValue([sampleAssignment]);

      const res = await request(app)
        .get(`/api/v1/teachers/${teacherId}/assignments`)
        .set('Authorization', `Bearer ${ownSchoolTeacherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });
  });

  describe('GET /api/v1/grades/:gradeId/teachers', () => {
    it('returns teachers assigned to a grade (200)', async () => {
      const app = createApp();
      vi.spyOn(gradesRepository, 'findById').mockResolvedValue(sampleGrade);
      vi.spyOn(teacherAssignmentsRepository, 'listByGrade').mockResolvedValue([sampleAssignment]);

      const res = await request(app)
        .get(`/api/v1/grades/${gradeId}/teachers`)
        .set('Authorization', `Bearer ${ownSchoolTeacherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });
  });

  describe('GET /api/v1/subjects/:subjectId/teachers', () => {
    it('returns teachers assigned to a subject (200)', async () => {
      const app = createApp();
      vi.spyOn(subjectsRepository, 'findById').mockResolvedValue(sampleSubject);
      vi.spyOn(teacherAssignmentsRepository, 'listBySubject').mockResolvedValue([sampleAssignment]);

      const res = await request(app)
        .get(`/api/v1/subjects/${subjectId}/teachers`)
        .set('Authorization', `Bearer ${ownSchoolTeacherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });
  });

  describe('PATCH /api/v1/teacher-assignments/:assignmentId', () => {
    it('updates assignment status (200) for school admin', async () => {
      const app = createApp();
      vi.spyOn(teacherAssignmentsRepository, 'findById').mockResolvedValue(sampleAssignment);
      const updated = { ...sampleAssignment, status: 'inactive' as const };
      vi.spyOn(teacherAssignmentsRepository, 'update').mockResolvedValue(updated);

      const res = await request(app)
        .patch(`/api/v1/teacher-assignments/${assignmentId}`)
        .set('Authorization', `Bearer ${ownSchoolAdminToken}`)
        .send({ status: 'inactive' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('inactive');
    });

    it('rejects modification from other school admin (403)', async () => {
      const app = createApp();
      vi.spyOn(teacherAssignmentsRepository, 'findById').mockResolvedValue(sampleAssignment);

      const res = await request(app)
        .patch(`/api/v1/teacher-assignments/${assignmentId}`)
        .set('Authorization', `Bearer ${otherSchoolAdminToken}`)
        .send({ status: 'inactive' });

      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/v1/teacher-assignments/:assignmentId', () => {
    it('soft deletes assignment (204) for school admin', async () => {
      const app = createApp();
      vi.spyOn(teacherAssignmentsRepository, 'findById').mockResolvedValue(sampleAssignment);
      vi.spyOn(teacherAssignmentsRepository, 'softDelete').mockResolvedValue(true);

      const res = await request(app)
        .delete(`/api/v1/teacher-assignments/${assignmentId}`)
        .set('Authorization', `Bearer ${ownSchoolAdminToken}`);

      expect(res.status).toBe(204);
    });

    it('rejects delete from other school admin (403)', async () => {
      const app = createApp();
      vi.spyOn(teacherAssignmentsRepository, 'findById').mockResolvedValue(sampleAssignment);

      const res = await request(app)
        .delete(`/api/v1/teacher-assignments/${assignmentId}`)
        .set('Authorization', `Bearer ${otherSchoolAdminToken}`);

      expect(res.status).toBe(403);
    });
  });
});
