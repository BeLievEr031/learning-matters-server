import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../../src/app.js';
import { env } from '../../src/config/env.js';
import { teachersRepository } from '../../src/modules/teachers/teachers.repository.js';
import { gradesRepository } from '../../src/modules/grades/grades.repository.js';
import { subjectsRepository } from '../../src/modules/subjects/subjects.repository.js';
import {
  teacherAssignmentsRepository,
  type TeacherAssignmentDetail,
} from '../../src/modules/teacher-assignments/teacher-assignments.repository.js';
import type { Teacher } from '../../src/db/schema/teachers.js';
import type { Grade } from '../../src/db/schema/grades.js';
import type { Subject, GradeSubject } from '../../src/db/schema/subjects.js';
import type { TeacherAssignment } from '../../src/db/schema/teacher-assignments.js';

describe('Teacher Assignments Integration Tests', () => {
  const app = createApp();

  const schoolAId = '11111111-1111-4111-8111-111111111111';
  const schoolBId = '22222222-2222-4222-8222-222222222222';

  const teacherA: Teacher = {
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    schoolId: schoolAId,
    userId: null,
    employeeId: 'EMP-001',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@alpha.edu',
    phone: null,
    qualification: 'M.Sc',
    status: 'active',
    joiningDate: '2025-01-01',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    deletedAt: null,
  };

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
    description: null,
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

  const assignmentA: TeacherAssignment = {
    id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    schoolId: schoolAId,
    teacherId: teacherA.id,
    gradeId: gradeA.id,
    subjectId: subjectA.id,
    assignedBy: null,
    status: 'active',
    effectiveDate: '2026-01-01',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    deletedAt: null,
  };

  const assignmentDetailA: TeacherAssignmentDetail = {
    ...assignmentA,
    teacherFirstName: teacherA.firstName,
    teacherLastName: teacherA.lastName,
    teacherEmail: teacherA.email,
    gradeName: gradeA.name,
    gradeNumber: gradeA.gradeNumber,
    gradeSection: gradeA.section,
    subjectName: subjectA.name,
    subjectCode: subjectA.code,
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

  describe('Assignment Validation & Creation Rules', () => {
    it('creates teacher assignment when all validations pass (201)', async () => {
      vi.spyOn(teachersRepository, 'findById').mockResolvedValue(teacherA);
      vi.spyOn(gradesRepository, 'findById').mockResolvedValue(gradeA);
      vi.spyOn(subjectsRepository, 'findById').mockResolvedValue(subjectA);
      vi.spyOn(subjectsRepository, 'findGradeSubject').mockResolvedValue(gradeSubjectA);
      vi.spyOn(teacherAssignmentsRepository, 'findByTeacherGradeSubject').mockResolvedValue(null);
      vi.spyOn(teacherAssignmentsRepository, 'create').mockResolvedValue(assignmentA);

      const res = await request(app)
        .post('/api/v1/teacher-assignments')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          teacherId: teacherA.id,
          gradeId: gradeA.id,
          subjectId: subjectA.id,
        });

      expect(res.status).toBe(201);
      expect((res.body as { data: TeacherAssignment }).data.id).toBe(assignmentA.id);
    });

    it('rejects assignment if subject is not associated with grade (400 Bad Request)', async () => {
      vi.spyOn(teachersRepository, 'findById').mockResolvedValue(teacherA);
      vi.spyOn(gradesRepository, 'findById').mockResolvedValue(gradeA);
      vi.spyOn(subjectsRepository, 'findById').mockResolvedValue(subjectA);
      vi.spyOn(subjectsRepository, 'findGradeSubject').mockResolvedValue(null);

      const res = await request(app)
        .post('/api/v1/teacher-assignments')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          teacherId: teacherA.id,
          gradeId: gradeA.id,
          subjectId: subjectA.id,
        });

      expect(res.status).toBe(400);
    });

    it('rejects duplicate assignment for same teacher, grade, and subject (409 Conflict)', async () => {
      vi.spyOn(teachersRepository, 'findById').mockResolvedValue(teacherA);
      vi.spyOn(gradesRepository, 'findById').mockResolvedValue(gradeA);
      vi.spyOn(subjectsRepository, 'findById').mockResolvedValue(subjectA);
      vi.spyOn(subjectsRepository, 'findGradeSubject').mockResolvedValue(gradeSubjectA);
      vi.spyOn(teacherAssignmentsRepository, 'findByTeacherGradeSubject').mockResolvedValue(
        assignmentA,
      );

      const res = await request(app)
        .post('/api/v1/teacher-assignments')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          teacherId: teacherA.id,
          gradeId: gradeA.id,
          subjectId: subjectA.id,
        });

      expect(res.status).toBe(409);
    });

    it('forbids school admin from creating assignment for another school (403 Forbidden)', async () => {
      vi.spyOn(teachersRepository, 'findById').mockResolvedValue(teacherA);
      vi.spyOn(gradesRepository, 'findById').mockResolvedValue(gradeA);
      vi.spyOn(subjectsRepository, 'findById').mockResolvedValue(subjectA);

      const res = await request(app)
        .post('/api/v1/teacher-assignments')
        .set('Authorization', `Bearer ${otherSchoolAdminToken}`)
        .send({
          teacherId: teacherA.id,
          gradeId: gradeA.id,
          subjectId: subjectA.id,
        });

      expect(res.status).toBe(403);
    });
  });

  describe('Querying Teacher Assignments & Sub-resources', () => {
    it('allows school admin to list assignments for their own school (200)', async () => {
      vi.spyOn(teacherAssignmentsRepository, 'list').mockResolvedValue([assignmentDetailA]);

      const res = await request(app)
        .get('/api/v1/teacher-assignments')
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      expect(res.status).toBe(200);
      expect((res.body as { data: TeacherAssignmentDetail[] }).data).toHaveLength(1);
    });

    it('rejects school admin querying assignments of another school (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/v1/teacher-assignments?schoolId=${schoolBId}`)
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      expect(res.status).toBe(403);
    });

    it('retrieves assignments by teacher via sub-resource (200)', async () => {
      vi.spyOn(teachersRepository, 'findById').mockResolvedValue(teacherA);
      vi.spyOn(teacherAssignmentsRepository, 'listByTeacher').mockResolvedValue([
        assignmentDetailA,
      ]);

      const res = await request(app)
        .get(`/api/v1/teachers/${teacherA.id}/assignments`)
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      expect(res.status).toBe(200);
      expect((res.body as { data: TeacherAssignmentDetail[] }).data).toHaveLength(1);
    });

    it('retrieves teachers by grade via sub-resource (200)', async () => {
      vi.spyOn(gradesRepository, 'findById').mockResolvedValue(gradeA);
      vi.spyOn(teacherAssignmentsRepository, 'listByGrade').mockResolvedValue([assignmentDetailA]);

      const res = await request(app)
        .get(`/api/v1/grades/${gradeA.id}/teachers`)
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      expect(res.status).toBe(200);
      expect((res.body as { data: TeacherAssignmentDetail[] }).data).toHaveLength(1);
    });

    it('retrieves teachers by subject via sub-resource (200)', async () => {
      vi.spyOn(subjectsRepository, 'findById').mockResolvedValue(subjectA);
      vi.spyOn(teacherAssignmentsRepository, 'listBySubject').mockResolvedValue([
        assignmentDetailA,
      ]);

      const res = await request(app)
        .get(`/api/v1/subjects/${subjectA.id}/teachers`)
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      expect(res.status).toBe(200);
      expect((res.body as { data: TeacherAssignmentDetail[] }).data).toHaveLength(1);
    });
  });

  describe('Update & Soft-Delete Assignment', () => {
    it('allows school admin to update assignment status (200)', async () => {
      vi.spyOn(teacherAssignmentsRepository, 'findById').mockResolvedValue(assignmentDetailA);
      vi.spyOn(teacherAssignmentsRepository, 'update').mockResolvedValue({
        ...assignmentA,
        status: 'inactive',
      });

      const res = await request(app)
        .patch(`/api/v1/teacher-assignments/${assignmentA.id}`)
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          status: 'inactive',
        });

      expect(res.status).toBe(200);
      expect((res.body as { data: TeacherAssignment }).data.status).toBe('inactive');
    });

    it('allows school admin to soft-delete assignment (204)', async () => {
      vi.spyOn(teacherAssignmentsRepository, 'findById').mockResolvedValue(assignmentDetailA);
      vi.spyOn(teacherAssignmentsRepository, 'softDelete').mockResolvedValue(true);

      const res = await request(app)
        .delete(`/api/v1/teacher-assignments/${assignmentA.id}`)
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      expect(res.status).toBe(204);
    });
  });
});
