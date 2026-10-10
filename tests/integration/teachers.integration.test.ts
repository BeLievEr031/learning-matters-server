import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../../src/app.js';
import { env } from '../../src/config/env.js';
import { schoolsRepository } from '../../src/modules/schools/schools.repository.js';
import { teachersRepository } from '../../src/modules/teachers/teachers.repository.js';
import { teacherAssignmentsRepository } from '../../src/modules/teacher-assignments/teacher-assignments.repository.js';
import type { School } from '../../src/db/schema/schools.js';
import type { Teacher } from '../../src/db/schema/teachers.js';

describe('Teachers Integration Tests', () => {
  const app = createApp();

  const schoolA: School = {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'School Alpha',
    code: 'SCH-A',
    address: '123 Main St',
    city: 'Delhi',
    state: 'Delhi',
    country: 'India',
    phone: '+919876543210',
    email: 'alpha@school.edu',
    website: 'https://alpha.edu',
    logoUrl: null,
    status: 'active',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    deletedAt: null,
  };

  const schoolBId = '22222222-2222-4222-8222-222222222222';

  const teacherA: Teacher = {
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    schoolId: schoolA.id,
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

  const schoolAdminToken = jwt.sign(
    { sub: 'user-admin-a', role: 'admin', schoolId: schoolA.id, jti: 'admin-a-jti' },
    env.JWT_ACCESS_SECRET,
  );

  const otherSchoolAdminToken = jwt.sign(
    { sub: 'user-admin-b', role: 'admin', schoolId: schoolBId, jti: 'admin-b-jti' },
    env.JWT_ACCESS_SECRET,
  );

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Teacher Provisioning & School Isolation', () => {
    it('allows school admin to create teacher in own school (201)', async () => {
      vi.spyOn(schoolsRepository, 'findById').mockResolvedValue(schoolA);
      vi.spyOn(teachersRepository, 'findBySchoolAndEmployeeId').mockResolvedValue(null);
      vi.spyOn(teachersRepository, 'findBySchoolAndEmail').mockResolvedValue(null);
      vi.spyOn(teachersRepository, 'create').mockResolvedValue(teacherA);

      const res = await request(app)
        .post(`/api/v1/schools/${schoolA.id}/teachers`)
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          employeeId: 'EMP-001',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@alpha.edu',
        });

      expect(res.status).toBe(201);
      expect((res.body as { data: Teacher }).data.employeeId).toBe('EMP-001');
    });

    it('denies school admin from creating teacher in another school (403 Forbidden)', async () => {
      vi.spyOn(schoolsRepository, 'findById').mockResolvedValue(schoolA);

      const res = await request(app)
        .post(`/api/v1/schools/${schoolA.id}/teachers`)
        .set('Authorization', `Bearer ${otherSchoolAdminToken}`)
        .send({
          employeeId: 'EMP-001',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@alpha.edu',
        });

      expect(res.status).toBe(403);
    });

    it('rejects duplicate employee ID in same school (409 Conflict)', async () => {
      vi.spyOn(schoolsRepository, 'findById').mockResolvedValue(schoolA);
      vi.spyOn(teachersRepository, 'findBySchoolAndEmployeeId').mockResolvedValue(teacherA);

      const res = await request(app)
        .post(`/api/v1/schools/${schoolA.id}/teachers`)
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          employeeId: 'EMP-001',
          firstName: 'Another',
          lastName: 'Teacher',
          email: 'unique@alpha.edu',
        });

      expect(res.status).toBe(409);
    });

    it('rejects duplicate email in same school (409 Conflict)', async () => {
      vi.spyOn(schoolsRepository, 'findById').mockResolvedValue(schoolA);
      vi.spyOn(teachersRepository, 'findBySchoolAndEmployeeId').mockResolvedValue(null);
      vi.spyOn(teachersRepository, 'findBySchoolAndEmail').mockResolvedValue(teacherA);

      const res = await request(app)
        .post(`/api/v1/schools/${schoolA.id}/teachers`)
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          employeeId: 'EMP-999',
          firstName: 'Another',
          lastName: 'Teacher',
          email: 'john@alpha.edu',
        });

      expect(res.status).toBe(409);
    });

    it('allows school admin to fetch teacher profile by ID (200)', async () => {
      vi.spyOn(teachersRepository, 'findById').mockResolvedValue(teacherA);

      const res = await request(app)
        .get(`/api/v1/teachers/${teacherA.id}`)
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      expect(res.status).toBe(200);
      expect((res.body as { data: Teacher }).data.id).toBe(teacherA.id);
    });

    it('denies school admin from fetching teacher belonging to another school (403 Forbidden)', async () => {
      vi.spyOn(teachersRepository, 'findById').mockResolvedValue(teacherA);

      const res = await request(app)
        .get(`/api/v1/teachers/${teacherA.id}`)
        .set('Authorization', `Bearer ${otherSchoolAdminToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('Teacher Soft-Delete Guard', () => {
    it('rejects deletion when active assignments exist (409 Conflict)', async () => {
      vi.spyOn(teachersRepository, 'findById').mockResolvedValue(teacherA);
      vi.spyOn(teacherAssignmentsRepository, 'hasActiveAssignmentsByTeacher').mockResolvedValue(
        true,
      );

      const res = await request(app)
        .delete(`/api/v1/teachers/${teacherA.id}`)
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      expect(res.status).toBe(409);
    });

    it('allows soft-delete when no active assignments exist (204)', async () => {
      vi.spyOn(teachersRepository, 'findById').mockResolvedValue(teacherA);
      vi.spyOn(teacherAssignmentsRepository, 'hasActiveAssignmentsByTeacher').mockResolvedValue(
        false,
      );
      vi.spyOn(teachersRepository, 'softDelete').mockResolvedValue(true);

      const res = await request(app)
        .delete(`/api/v1/teachers/${teacherA.id}`)
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      expect(res.status).toBe(204);
    });
  });
});
