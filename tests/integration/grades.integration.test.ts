import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../../src/app.js';
import { env } from '../../src/config/env.js';
import { boardsRepository } from '../../src/modules/boards/boards.repository.js';
import { gradesRepository } from '../../src/modules/grades/grades.repository.js';
import { teachersRepository } from '../../src/modules/teachers/teachers.repository.js';
import { studentsRepository } from '../../src/modules/students/students.repository.js';
import { teacherAssignmentsRepository } from '../../src/modules/teacher-assignments/teacher-assignments.repository.js';
import type { Board } from '../../src/db/schema/boards.js';
import type { Grade } from '../../src/db/schema/grades.js';
import type { Teacher } from '../../src/db/schema/teachers.js';

describe('Grades Integration Tests', () => {
  const app = createApp();

  const schoolAId = '11111111-1111-4111-8111-111111111111';
  const schoolBId = '22222222-2222-4222-8222-222222222222';

  const boardA: Board = {
    id: '33333333-3333-4333-8333-333333333333',
    schoolId: schoolAId,
    name: 'CBSE Board',
    code: 'CBSE',
    description: null,
    status: 'active',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    deletedAt: null,
  };

  const gradeA: Grade = {
    id: '55555555-5555-4555-8555-555555555555',
    schoolId: schoolAId,
    boardId: boardA.id,
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

  const teacherA: Teacher = {
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    schoolId: schoolAId,
    userId: null,
    employeeId: 'EMP-001',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@alpha.edu',
    phone: '+919876543210',
    qualification: 'M.Ed',
    status: 'active',
    joiningDate: '2025-01-01',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    deletedAt: null,
  };

  const teacherB: Teacher = {
    id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    schoolId: schoolBId,
    userId: null,
    employeeId: 'EMP-002',
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane@beta.edu',
    phone: '+919876543211',
    qualification: 'B.Ed',
    status: 'active',
    joiningDate: '2025-01-01',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    deletedAt: null,
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

  describe('Grade Creation & Section Uniqueness', () => {
    it('allows school admin to create grade under own board (201)', async () => {
      vi.spyOn(boardsRepository, 'findById').mockResolvedValue(boardA);
      vi.spyOn(gradesRepository, 'findByBoardGradeAndSection').mockResolvedValue(null);
      vi.spyOn(gradesRepository, 'create').mockResolvedValue(gradeA);

      const res = await request(app)
        .post(`/api/v1/boards/${boardA.id}/grades`)
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          name: 'Grade 5 Section A',
          code: 'G5-A',
          gradeNumber: 5,
          section: 'A',
          capacity: 35,
        });

      expect(res.status).toBe(201);
      expect((res.body as { data: Grade }).data.code).toBe('G5-A');
    });

    it('rejects duplicate grade number + section in same board (409 Conflict)', async () => {
      vi.spyOn(boardsRepository, 'findById').mockResolvedValue(boardA);
      vi.spyOn(gradesRepository, 'findByBoardGradeAndSection').mockResolvedValue(gradeA);

      const res = await request(app)
        .post(`/api/v1/boards/${boardA.id}/grades`)
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          name: 'Grade 5 Section A Duplicate',
          code: 'G5-A-DUP',
          gradeNumber: 5,
          section: 'A',
        });

      expect(res.status).toBe(409);
    });

    it('denies school admin from creating grade under board belonging to another school (403)', async () => {
      vi.spyOn(boardsRepository, 'findById').mockResolvedValue(boardA);

      const res = await request(app)
        .post(`/api/v1/boards/${boardA.id}/grades`)
        .set('Authorization', `Bearer ${otherSchoolAdminToken}`)
        .send({
          name: 'Grade 5 Section A',
          code: 'G5-A',
          gradeNumber: 5,
          section: 'A',
        });

      expect(res.status).toBe(403);
    });
  });

  describe('Class Teacher Assignment', () => {
    it('assigns class teacher from same school (200)', async () => {
      vi.spyOn(gradesRepository, 'findById').mockResolvedValue(gradeA);
      vi.spyOn(teachersRepository, 'findById').mockResolvedValue(teacherA);
      vi.spyOn(gradesRepository, 'setClassTeacher').mockResolvedValue({
        ...gradeA,
        classTeacherId: teacherA.id,
      });

      const res = await request(app)
        .put(`/api/v1/grades/${gradeA.id}/class-teacher`)
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          teacherId: teacherA.id,
        });

      expect(res.status).toBe(200);
      expect((res.body as { data: Grade }).data.classTeacherId).toBe(teacherA.id);
    });

    it('rejects assigning teacher from a different school (400 Bad Request)', async () => {
      vi.spyOn(gradesRepository, 'findById').mockResolvedValue(gradeA);
      vi.spyOn(teachersRepository, 'findById').mockResolvedValue(teacherB);

      const res = await request(app)
        .put(`/api/v1/grades/${gradeA.id}/class-teacher`)
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          teacherId: teacherB.id,
        });

      expect(res.status).toBe(400);
    });
  });

  describe('Grade Soft-Delete Guards', () => {
    it('rejects deletion when active students exist (409 Conflict)', async () => {
      vi.spyOn(gradesRepository, 'findById').mockResolvedValue(gradeA);
      vi.spyOn(studentsRepository, 'hasActiveStudentsByGrade').mockResolvedValue(true);

      const res = await request(app)
        .delete(`/api/v1/grades/${gradeA.id}`)
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      expect(res.status).toBe(409);
    });

    it('rejects deletion when active teacher assignments exist (409 Conflict)', async () => {
      vi.spyOn(gradesRepository, 'findById').mockResolvedValue(gradeA);
      vi.spyOn(studentsRepository, 'hasActiveStudentsByGrade').mockResolvedValue(false);
      vi.spyOn(teacherAssignmentsRepository, 'hasActiveAssignmentsByGrade').mockResolvedValue(true);

      const res = await request(app)
        .delete(`/api/v1/grades/${gradeA.id}`)
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      expect(res.status).toBe(409);
    });

    it('allows soft-delete when grade has no active dependencies (204)', async () => {
      vi.spyOn(gradesRepository, 'findById').mockResolvedValue(gradeA);
      vi.spyOn(studentsRepository, 'hasActiveStudentsByGrade').mockResolvedValue(false);
      vi.spyOn(teacherAssignmentsRepository, 'hasActiveAssignmentsByGrade').mockResolvedValue(
        false,
      );
      vi.spyOn(gradesRepository, 'softDelete').mockResolvedValue(true);

      const res = await request(app)
        .delete(`/api/v1/grades/${gradeA.id}`)
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      expect(res.status).toBe(204);
    });
  });
});
