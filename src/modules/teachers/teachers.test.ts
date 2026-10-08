import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../../app.js';
import { env } from '../../config/env.js';
import { teachersRepository } from './teachers.repository.js';
import { schoolsRepository } from '../schools/schools.repository.js';
import type { Teacher } from '../../db/schema/teachers.js';
import type { School } from '../../db/schema/schools.js';

describe('Teachers Module API', () => {
  const school1Id = '11111111-1111-4111-a111-111111111111';
  const school2Id = '22222222-2222-4222-a222-222222222222';
  const teacherUserId = '99999999-9999-4999-a999-999999999999';

  const sampleSchool: School = {
    id: school1Id,
    name: 'Springfield High',
    code: 'SPFLD',
    address: '742 Evergreen Terrace',
    city: 'Springfield',
    state: 'Oregon',
    country: 'USA',
    phone: '+15551234567',
    email: 'contact@springfield.edu',
    website: 'https://springfield.edu',
    logoUrl: null,
    status: 'active',
    createdAt: new Date('2026-01-01T12:00:00Z'),
    updatedAt: new Date('2026-01-01T12:00:00Z'),
    deletedAt: null,
  };

  const sampleTeacher: Teacher = {
    id: '55555555-5555-4555-a555-555555555555',
    schoolId: school1Id,
    userId: teacherUserId,
    employeeId: 'EMP-001',
    firstName: 'Edna',
    lastName: 'Krabappel',
    email: 'edna@springfield.edu',
    phone: '+15559876543',
    joiningDate: new Date('2025-08-01T00:00:00Z'),
    qualification: 'M.Ed.',
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

  const ownSchoolPrincipalToken = jwt.sign(
    { sub: 'user-prin1', role: 'principal', schoolId: school1Id, jti: 'prin1-jti' },
    env.JWT_ACCESS_SECRET,
  );

  const ownTeacherSelfToken = jwt.sign(
    { sub: teacherUserId, role: 'teacher', schoolId: school1Id, jti: 'teach1-jti' },
    env.JWT_ACCESS_SECRET,
  );

  const otherSchoolTeacherToken = jwt.sign(
    { sub: 'user-teach2', role: 'teacher', schoolId: school2Id, jti: 'teach2-jti' },
    env.JWT_ACCESS_SECRET,
  );

  const studentToken = jwt.sign(
    { sub: 'user-stu', role: 'student', schoolId: school1Id, jti: 'stu-jti' },
    env.JWT_ACCESS_SECRET,
  );

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /api/v1/schools/:schoolId/teachers', () => {
    it('creates a teacher (201) for school admin', async () => {
      const app = createApp();
      vi.spyOn(schoolsRepository, 'findById').mockResolvedValue(sampleSchool);
      vi.spyOn(teachersRepository, 'findBySchoolAndEmployeeId').mockResolvedValue(null);
      vi.spyOn(teachersRepository, 'findBySchoolAndEmail').mockResolvedValue(null);
      vi.spyOn(teachersRepository, 'create').mockResolvedValue(sampleTeacher);

      const res = await request(app)
        .post(`/api/v1/schools/${school1Id}/teachers`)
        .set('Authorization', `Bearer ${ownSchoolAdminToken}`)
        .send({
          employeeId: 'EMP-001',
          firstName: 'Edna',
          lastName: 'Krabappel',
          email: 'edna@springfield.edu',
        });

      expect(res.status).toBe(201);
      const body = res.body as { data: Teacher };
      expect(body.data.id).toBe(sampleTeacher.id);
      expect(body.data.employeeId).toBe('EMP-001');
    });

    it('creates a teacher (201) for super_admin in any school', async () => {
      const app = createApp();
      vi.spyOn(schoolsRepository, 'findById').mockResolvedValue(sampleSchool);
      vi.spyOn(teachersRepository, 'findBySchoolAndEmployeeId').mockResolvedValue(null);
      vi.spyOn(teachersRepository, 'findBySchoolAndEmail').mockResolvedValue(null);
      vi.spyOn(teachersRepository, 'create').mockResolvedValue(sampleTeacher);

      const res = await request(app)
        .post(`/api/v1/schools/${school1Id}/teachers`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          employeeId: 'EMP-001',
          firstName: 'Edna',
          lastName: 'Krabappel',
          email: 'edna@springfield.edu',
        });

      expect(res.status).toBe(201);
    });

    it('returns 403 when admin from another school tries to create teacher', async () => {
      const app = createApp();
      vi.spyOn(schoolsRepository, 'findById').mockResolvedValue(sampleSchool);

      const res = await request(app)
        .post(`/api/v1/schools/${school1Id}/teachers`)
        .set('Authorization', `Bearer ${otherSchoolAdminToken}`)
        .send({
          employeeId: 'EMP-001',
          firstName: 'Edna',
          lastName: 'Krabappel',
          email: 'edna@springfield.edu',
        });

      expect(res.status).toBe(403);
    });

    it('returns 403 when teacher or principal attempts to create teacher', async () => {
      const app = createApp();

      const res = await request(app)
        .post(`/api/v1/schools/${school1Id}/teachers`)
        .set('Authorization', `Bearer ${ownSchoolPrincipalToken}`)
        .send({
          employeeId: 'EMP-001',
          firstName: 'Edna',
          lastName: 'Krabappel',
          email: 'edna@springfield.edu',
        });

      expect(res.status).toBe(403);
    });

    it('returns 401 without authorization header', async () => {
      const app = createApp();

      const res = await request(app).post(`/api/v1/schools/${school1Id}/teachers`).send({
        employeeId: 'EMP-001',
        firstName: 'Edna',
        lastName: 'Krabappel',
        email: 'edna@springfield.edu',
      });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/schools/:schoolId/teachers', () => {
    it('returns paginated teachers for principal (200)', async () => {
      const app = createApp();
      vi.spyOn(schoolsRepository, 'findById').mockResolvedValue(sampleSchool);
      vi.spyOn(teachersRepository, 'listBySchool').mockResolvedValue([sampleTeacher]);

      const res = await request(app)
        .get(`/api/v1/schools/${school1Id}/teachers`)
        .set('Authorization', `Bearer ${ownSchoolPrincipalToken}`);

      expect(res.status).toBe(200);
      const body = res.body as { data: Teacher[] };
      expect(body.data).toHaveLength(1);
      expect(body.data[0]?.employeeId).toBe('EMP-001');
    });

    it('returns 403 for student', async () => {
      const app = createApp();

      const res = await request(app)
        .get(`/api/v1/schools/${school1Id}/teachers`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
    });

    it('returns 404 if school not found', async () => {
      const app = createApp();
      vi.spyOn(schoolsRepository, 'findById').mockResolvedValue(null);

      const res = await request(app)
        .get(`/api/v1/schools/${school1Id}/teachers`)
        .set('Authorization', `Bearer ${ownSchoolAdminToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/v1/teachers/:teacherId', () => {
    it('returns teacher when teacher views themselves (200)', async () => {
      const app = createApp();
      vi.spyOn(teachersRepository, 'findById').mockResolvedValue(sampleTeacher);

      const res = await request(app)
        .get(`/api/v1/teachers/${sampleTeacher.id}`)
        .set('Authorization', `Bearer ${ownTeacherSelfToken}`);

      expect(res.status).toBe(200);
      const body = res.body as { data: Teacher };
      expect(body.data.id).toBe(sampleTeacher.id);
    });

    it('returns 403 for user from different school', async () => {
      const app = createApp();
      vi.spyOn(teachersRepository, 'findById').mockResolvedValue(sampleTeacher);

      const res = await request(app)
        .get(`/api/v1/teachers/${sampleTeacher.id}`)
        .set('Authorization', `Bearer ${otherSchoolTeacherToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('PATCH /api/v1/teachers/:teacherId', () => {
    it('updates teacher for admin (200)', async () => {
      const app = createApp();
      vi.spyOn(teachersRepository, 'findById').mockResolvedValue(sampleTeacher);
      vi.spyOn(teachersRepository, 'update').mockResolvedValue({
        ...sampleTeacher,
        firstName: 'Elizabeth',
      });

      const res = await request(app)
        .patch(`/api/v1/teachers/${sampleTeacher.id}`)
        .set('Authorization', `Bearer ${ownSchoolAdminToken}`)
        .send({ firstName: 'Elizabeth' });

      expect(res.status).toBe(200);
      const body = res.body as { data: Teacher };
      expect(body.data.firstName).toBe('Elizabeth');
    });

    it('returns 403 when principal attempts to update teacher', async () => {
      const app = createApp();

      const res = await request(app)
        .patch(`/api/v1/teachers/${sampleTeacher.id}`)
        .set('Authorization', `Bearer ${ownSchoolPrincipalToken}`)
        .send({ firstName: 'Elizabeth' });

      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/v1/teachers/:teacherId', () => {
    it('soft-deletes teacher for admin (204)', async () => {
      const app = createApp();
      vi.spyOn(teachersRepository, 'findById').mockResolvedValue(sampleTeacher);
      vi.spyOn(teachersRepository, 'softDelete').mockResolvedValue(true);

      const res = await request(app)
        .delete(`/api/v1/teachers/${sampleTeacher.id}`)
        .set('Authorization', `Bearer ${ownSchoolAdminToken}`);

      expect(res.status).toBe(204);
    });

    it('returns 403 for principal attempting to delete teacher', async () => {
      const app = createApp();

      const res = await request(app)
        .delete(`/api/v1/teachers/${sampleTeacher.id}`)
        .set('Authorization', `Bearer ${ownSchoolPrincipalToken}`);

      expect(res.status).toBe(403);
    });
  });
});
