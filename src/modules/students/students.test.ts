import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../../app.js';
import { env } from '../../config/env.js';
import { studentsRepository } from './students.repository.js';
import { gradesRepository } from '../grades/grades.repository.js';
import { usersRepository } from '../users/users.repository.js';
import type { Student } from '../../db/schema/students.js';
import type { Grade } from '../../db/schema/grades.js';
import type { User } from '../../db/schema/users.js';
import type { ErrorResponsePayload } from '../../middleware/error-handler.js';

describe('Students Module API', () => {
  const school1Id = '11111111-1111-4111-a111-111111111111';
  const school2Id = '22222222-2222-4222-a222-222222222222';
  const boardId = '33333333-3333-4333-a333-333333333333';
  const grade1Id = '44444444-4444-4444-a444-444444444444';
  const grade2Id = '55555555-5555-4555-a555-555555555555';
  const studentUserId = '66666666-6666-4666-a666-666666666666';
  const studentId = '77777777-7777-4777-a777-777777777777';

  const sampleGrade: Grade = {
    id: grade1Id,
    schoolId: school1Id,
    boardId,
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

  const sampleTargetGrade: Grade = {
    id: grade2Id,
    schoolId: school1Id,
    boardId,
    name: 'Grade 10 - Section B',
    code: 'G10-B',
    gradeNumber: 10,
    section: 'B',
    capacity: 40,
    classTeacherId: null,
    status: 'active',
    createdAt: new Date('2026-01-01T12:00:00Z'),
    updatedAt: new Date('2026-01-01T12:00:00Z'),
    deletedAt: null,
  };

  const sampleStudent: Student = {
    id: studentId,
    schoolId: school1Id,
    boardId,
    gradeId: grade1Id,
    userId: studentUserId,
    admissionNumber: 'ADM-2026-001',
    firstName: 'Bart',
    lastName: 'Simpson',
    dateOfBirth: new Date('2012-04-01T00:00:00Z'),
    gender: 'male',
    email: 'bart@simpson.edu',
    phone: null,
    guardianName: 'Homer Simpson',
    guardianPhone: '+15551234567',
    guardianEmail: 'homer@simpson.edu',
    address: '742 Evergreen Terrace',
    status: 'active',
    createdAt: new Date('2026-01-01T12:00:00Z'),
    updatedAt: new Date('2026-01-01T12:00:00Z'),
    deletedAt: null,
  };

  const sampleUser: User = {
    id: studentUserId,
    schoolId: school1Id,
    email: 'bart@simpson.edu',
    passwordHash: 'hash',
    firstName: 'Bart',
    lastName: 'Simpson',
    phone: null,
    role: 'student',
    status: 'active',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
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

  const ownSchoolTeacherToken = jwt.sign(
    { sub: 'user-teacher1', role: 'teacher', schoolId: school1Id, jti: 'teacher1-jti' },
    env.JWT_ACCESS_SECRET,
  );

  const studentSelfToken = jwt.sign(
    { sub: studentUserId, role: 'student', schoolId: school1Id, jti: 'stu-jti' },
    env.JWT_ACCESS_SECRET,
  );

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /api/v1/grades/:gradeId/students', () => {
    it('creates a student under grade (201) for school admin', async () => {
      const app = createApp();
      vi.spyOn(gradesRepository, 'findById').mockResolvedValue(sampleGrade);
      vi.spyOn(studentsRepository, 'findBySchoolAndAdmissionNumber').mockResolvedValue(null);
      vi.spyOn(usersRepository, 'findById').mockResolvedValue(sampleUser);
      vi.spyOn(studentsRepository, 'create').mockResolvedValue(sampleStudent);

      const res = await request(app)
        .post(`/api/v1/grades/${grade1Id}/students`)
        .set('Authorization', `Bearer ${ownSchoolAdminToken}`)
        .send({
          admissionNumber: 'ADM-2026-001',
          firstName: 'Bart',
          lastName: 'Simpson',
          userId: studentUserId,
          gender: 'male',
          status: 'active',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.admissionNumber).toBe('ADM-2026-001');
    });

    it('rejects creation if admission number already exists (409)', async () => {
      const app = createApp();
      vi.spyOn(gradesRepository, 'findById').mockResolvedValue(sampleGrade);
      vi.spyOn(studentsRepository, 'findBySchoolAndAdmissionNumber').mockResolvedValue(
        sampleStudent,
      );

      const res = await request(app)
        .post(`/api/v1/grades/${grade1Id}/students`)
        .set('Authorization', `Bearer ${ownSchoolAdminToken}`)
        .send({
          admissionNumber: 'ADM-2026-001',
          firstName: 'Bart',
          lastName: 'Simpson',
        });

      expect(res.status).toBe(409);
      expect((res.body as ErrorResponsePayload).error.code).toBe('CONFLICT');
    });

    it('rejects creation under inactive grade (400)', async () => {
      const app = createApp();
      vi.spyOn(gradesRepository, 'findById').mockResolvedValue({
        ...sampleGrade,
        status: 'inactive',
      });

      const res = await request(app)
        .post(`/api/v1/grades/${grade1Id}/students`)
        .set('Authorization', `Bearer ${ownSchoolAdminToken}`)
        .send({
          admissionNumber: 'ADM-2026-001',
          firstName: 'Bart',
          lastName: 'Simpson',
        });

      expect(res.status).toBe(400);
      expect((res.body as ErrorResponsePayload).error.code).toBe('BAD_REQUEST');
    });

    it('rejects creation from other school admin (403)', async () => {
      const app = createApp();
      vi.spyOn(gradesRepository, 'findById').mockResolvedValue(sampleGrade);

      const res = await request(app)
        .post(`/api/v1/grades/${grade1Id}/students`)
        .set('Authorization', `Bearer ${otherSchoolAdminToken}`)
        .send({
          admissionNumber: 'ADM-2026-001',
          firstName: 'Bart',
          lastName: 'Simpson',
        });

      expect(res.status).toBe(403);
    });

    it('rejects student role from creating student (403)', async () => {
      const app = createApp();
      const res = await request(app)
        .post(`/api/v1/grades/${grade1Id}/students`)
        .set('Authorization', `Bearer ${studentSelfToken}`)
        .send({
          admissionNumber: 'ADM-2026-001',
          firstName: 'Bart',
          lastName: 'Simpson',
        });

      expect(res.status).toBe(403);
    });

    it('rejects regular teacher from creating student (403)', async () => {
      const app = createApp();
      const res = await request(app)
        .post(`/api/v1/grades/${grade1Id}/students`)
        .set('Authorization', `Bearer ${ownSchoolTeacherToken}`)
        .send({
          admissionNumber: 'ADM-2026-001',
          firstName: 'Bart',
          lastName: 'Simpson',
        });

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/v1/grades/:gradeId/students', () => {
    it('returns paginated students for grade (200) to class_teacher', async () => {
      const app = createApp();
      vi.spyOn(gradesRepository, 'findById').mockResolvedValue(sampleGrade);
      vi.spyOn(studentsRepository, 'listByGrade').mockResolvedValue([sampleStudent]);

      const res = await request(app)
        .get(`/api/v1/grades/${grade1Id}/students`)
        .set('Authorization', `Bearer ${ownSchoolClassTeacherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.pageInfo).toBeDefined();
    });

    it('allows principal to list students (200)', async () => {
      const app = createApp();
      vi.spyOn(gradesRepository, 'findById').mockResolvedValue(sampleGrade);
      vi.spyOn(studentsRepository, 'listByGrade').mockResolvedValue([sampleStudent]);

      const res = await request(app)
        .get(`/api/v1/grades/${grade1Id}/students`)
        .set('Authorization', `Bearer ${ownSchoolPrincipalToken}`);

      expect(res.status).toBe(200);
    });

    it('rejects other school admin (403)', async () => {
      const app = createApp();
      vi.spyOn(gradesRepository, 'findById').mockResolvedValue(sampleGrade);

      const res = await request(app)
        .get(`/api/v1/grades/${grade1Id}/students`)
        .set('Authorization', `Bearer ${otherSchoolAdminToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/v1/students/:studentId', () => {
    it('returns student profile for own school admin (200)', async () => {
      const app = createApp();
      vi.spyOn(studentsRepository, 'findById').mockResolvedValue(sampleStudent);

      const res = await request(app)
        .get(`/api/v1/students/${studentId}`)
        .set('Authorization', `Bearer ${ownSchoolAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(studentId);
    });

    it('returns student profile for the student themselves (200)', async () => {
      const app = createApp();
      vi.spyOn(studentsRepository, 'findById').mockResolvedValue(sampleStudent);

      const res = await request(app)
        .get(`/api/v1/students/${studentId}`)
        .set('Authorization', `Bearer ${studentSelfToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(studentId);
    });

    it('rejects access from admin of another school (403)', async () => {
      const app = createApp();
      vi.spyOn(studentsRepository, 'findById').mockResolvedValue(sampleStudent);

      const res = await request(app)
        .get(`/api/v1/students/${studentId}`)
        .set('Authorization', `Bearer ${otherSchoolAdminToken}`);

      expect(res.status).toBe(403);
    });

    it('returns 404 if student not found', async () => {
      const app = createApp();
      vi.spyOn(studentsRepository, 'findById').mockResolvedValue(null);

      const res = await request(app)
        .get(`/api/v1/students/${studentId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/v1/students/:studentId', () => {
    it('updates student details (200) for school admin', async () => {
      const app = createApp();
      vi.spyOn(studentsRepository, 'findById').mockResolvedValue(sampleStudent);
      const updated = { ...sampleStudent, firstName: 'Bartholomew' };
      vi.spyOn(studentsRepository, 'update').mockResolvedValue(updated);

      const res = await request(app)
        .patch(`/api/v1/students/${studentId}`)
        .set('Authorization', `Bearer ${ownSchoolAdminToken}`)
        .send({ firstName: 'Bartholomew' });

      expect(res.status).toBe(200);
      expect(res.body.data.firstName).toBe('Bartholomew');
    });

    it('rejects updates from other school admin (403)', async () => {
      const app = createApp();
      vi.spyOn(studentsRepository, 'findById').mockResolvedValue(sampleStudent);

      const res = await request(app)
        .patch(`/api/v1/students/${studentId}`)
        .set('Authorization', `Bearer ${otherSchoolAdminToken}`)
        .send({ firstName: 'Bartholomew' });

      expect(res.status).toBe(403);
    });
  });

  describe('PATCH /api/v1/students/:studentId/transfer', () => {
    it('transfers student to another grade within same school (200)', async () => {
      const app = createApp();
      vi.spyOn(studentsRepository, 'findById').mockResolvedValue(sampleStudent);
      vi.spyOn(gradesRepository, 'findById').mockResolvedValue(sampleTargetGrade);
      const transferred = { ...sampleStudent, gradeId: grade2Id };
      vi.spyOn(studentsRepository, 'transfer').mockResolvedValue(transferred);

      const res = await request(app)
        .patch(`/api/v1/students/${studentId}/transfer`)
        .set('Authorization', `Bearer ${ownSchoolAdminToken}`)
        .send({ targetGradeId: grade2Id });

      expect(res.status).toBe(200);
      expect(res.body.data.gradeId).toBe(grade2Id);
    });

    it('rejects transfer if target grade belongs to another school (400)', async () => {
      const app = createApp();
      vi.spyOn(studentsRepository, 'findById').mockResolvedValue(sampleStudent);
      vi.spyOn(gradesRepository, 'findById').mockResolvedValue({
        ...sampleTargetGrade,
        schoolId: school2Id,
      });

      const res = await request(app)
        .patch(`/api/v1/students/${studentId}/transfer`)
        .set('Authorization', `Bearer ${ownSchoolAdminToken}`)
        .send({ targetGradeId: grade2Id });

      expect(res.status).toBe(400);
      expect((res.body as ErrorResponsePayload).error.code).toBe('BAD_REQUEST');
    });
  });

  describe('DELETE /api/v1/students/:studentId', () => {
    it('soft deletes student (204) for school admin', async () => {
      const app = createApp();
      vi.spyOn(studentsRepository, 'findById').mockResolvedValue(sampleStudent);
      vi.spyOn(studentsRepository, 'softDelete').mockResolvedValue(true);

      const res = await request(app)
        .delete(`/api/v1/students/${studentId}`)
        .set('Authorization', `Bearer ${ownSchoolAdminToken}`);

      expect(res.status).toBe(204);
    });

    it('rejects deletion from other school admin (403)', async () => {
      const app = createApp();
      vi.spyOn(studentsRepository, 'findById').mockResolvedValue(sampleStudent);

      const res = await request(app)
        .delete(`/api/v1/students/${studentId}`)
        .set('Authorization', `Bearer ${otherSchoolAdminToken}`);

      expect(res.status).toBe(403);
    });
  });
});
