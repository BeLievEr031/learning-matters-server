import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../../src/app.js';
import { env } from '../../src/config/env.js';
import { gradesRepository } from '../../src/modules/grades/grades.repository.js';
import { studentsRepository } from '../../src/modules/students/students.repository.js';
import type { Grade } from '../../src/db/schema/grades.js';
import type { Student } from '../../src/db/schema/students.js';

describe('Students Integration Tests', () => {
  const app = createApp();

  const schoolAId = '11111111-1111-4111-8111-111111111111';
  const schoolBId = '22222222-2222-4222-8222-222222222222';

  const gradeA1: Grade = {
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

  const gradeA2: Grade = {
    id: '66666666-6666-4666-8666-666666666666',
    schoolId: schoolAId,
    boardId: '33333333-3333-4333-8333-333333333333',
    name: 'Grade 5 Section B',
    code: 'G5-B',
    gradeNumber: 5,
    section: 'B',
    capacity: 35,
    classTeacherId: null,
    status: 'active',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    deletedAt: null,
  };

  const gradeB: Grade = {
    id: '77777777-7777-4777-8777-777777777777',
    schoolId: schoolBId,
    boardId: '44444444-4444-4444-8444-444444444444',
    name: 'Grade 5 Section A School B',
    code: 'G5-A-B',
    gradeNumber: 5,
    section: 'A',
    capacity: 30,
    classTeacherId: null,
    status: 'active',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    deletedAt: null,
  };

  const studentA: Student = {
    id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    schoolId: schoolAId,
    boardId: gradeA1.boardId,
    gradeId: gradeA1.id,
    userId: null,
    admissionNumber: 'ADM-2026-001',
    firstName: 'Alice',
    lastName: 'Brown',
    dateOfBirth: '2015-05-15',
    gender: 'female',
    email: 'alice@student.edu',
    phone: null,
    guardianName: 'Robert Brown',
    guardianPhone: '+919876543210',
    guardianEmail: 'robert@parent.edu',
    address: '456 Oak Avenue',
    status: 'active',
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

  describe('Student Enrollment & Admission Uniqueness', () => {
    it('allows school admin to enroll student in grade (201)', async () => {
      vi.spyOn(gradesRepository, 'findById').mockResolvedValue(gradeA1);
      vi.spyOn(studentsRepository, 'findBySchoolAndAdmissionNumber').mockResolvedValue(null);
      vi.spyOn(studentsRepository, 'create').mockResolvedValue(studentA);

      const res = await request(app)
        .post(`/api/v1/grades/${gradeA1.id}/students`)
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          admissionNumber: 'ADM-2026-001',
          firstName: 'Alice',
          lastName: 'Brown',
          gender: 'female',
        });

      expect(res.status).toBe(201);
      expect((res.body as { data: Student }).data.admissionNumber).toBe('ADM-2026-001');
    });

    it('rejects duplicate admission number in same school (409 Conflict)', async () => {
      vi.spyOn(gradesRepository, 'findById').mockResolvedValue(gradeA1);
      vi.spyOn(studentsRepository, 'findBySchoolAndAdmissionNumber').mockResolvedValue(studentA);

      const res = await request(app)
        .post(`/api/v1/grades/${gradeA1.id}/students`)
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          admissionNumber: 'ADM-2026-001',
          firstName: 'Duplicate',
          lastName: 'Student',
        });

      expect(res.status).toBe(409);
    });

    it('rejects enrolling student into an inactive grade (400 Bad Request)', async () => {
      vi.spyOn(gradesRepository, 'findById').mockResolvedValue({
        ...gradeA1,
        status: 'inactive',
      });

      const res = await request(app)
        .post(`/api/v1/grades/${gradeA1.id}/students`)
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          admissionNumber: 'ADM-2026-002',
          firstName: 'Charlie',
          lastName: 'Davis',
        });

      expect(res.status).toBe(400);
    });
  });

  describe('Grade Transfer Scenarios', () => {
    it('transfers student to another grade within same school (200)', async () => {
      vi.spyOn(studentsRepository, 'findById').mockResolvedValue(studentA);
      vi.spyOn(gradesRepository, 'findById').mockResolvedValue(gradeA2);
      vi.spyOn(studentsRepository, 'transfer').mockResolvedValue({
        ...studentA,
        gradeId: gradeA2.id,
      });

      const res = await request(app)
        .patch(`/api/v1/students/${studentA.id}/transfer`)
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          targetGradeId: gradeA2.id,
        });

      expect(res.status).toBe(200);
      expect((res.body as { data: Student }).data.gradeId).toBe(gradeA2.id);
    });

    it('rejects transfer to a grade in another school (400 Bad Request)', async () => {
      vi.spyOn(studentsRepository, 'findById').mockResolvedValue(studentA);
      vi.spyOn(gradesRepository, 'findById').mockResolvedValue(gradeB);

      const res = await request(app)
        .patch(`/api/v1/students/${studentA.id}/transfer`)
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          targetGradeId: gradeB.id,
        });

      expect(res.status).toBe(400);
    });

    it('denies school admin from transferring student belonging to another school (403 Forbidden)', async () => {
      vi.spyOn(studentsRepository, 'findById').mockResolvedValue(studentA);

      const res = await request(app)
        .patch(`/api/v1/students/${studentA.id}/transfer`)
        .set('Authorization', `Bearer ${otherSchoolAdminToken}`)
        .send({
          targetGradeId: gradeA2.id,
        });

      expect(res.status).toBe(403);
    });
  });

  describe('Student Soft-Delete', () => {
    it('allows school admin to soft-delete student (204)', async () => {
      vi.spyOn(studentsRepository, 'findById').mockResolvedValue(studentA);
      vi.spyOn(studentsRepository, 'softDelete').mockResolvedValue(true);

      const res = await request(app)
        .delete(`/api/v1/students/${studentA.id}`)
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      expect(res.status).toBe(204);
    });
  });
});
