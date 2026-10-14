import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../../app.js';
import { env } from '../../config/env.js';
import { teachersRepository } from './teachers.repository.js';
import { schoolsRepository } from '../schools/schools.repository.js';
import { usersRepository } from '../users/users.repository.js';
import { gradesRepository } from '../grades/grades.repository.js';
import { studentsRepository } from '../students/students.repository.js';
import { teacherAssignmentsRepository } from '../teacher-assignments/teacher-assignments.repository.js';
import * as txModule from '../../db/transaction.js';
import type { Teacher } from '../../db/schema/teachers.js';
import type { School } from '../../db/schema/schools.js';
import type { Grade } from '../../db/schema/grades.js';
import type { Student } from '../../db/schema/students.js';

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
  const ownSchoolTeacherToken = ownTeacherSelfToken;

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
    vi.spyOn(teacherAssignmentsRepository, 'hasActiveAssignmentsByTeacher').mockResolvedValue(
      false,
    );
    vi.spyOn(txModule, 'withTransaction').mockImplementation(async (fn) =>
      fn({} as unknown as txModule.Transaction),
    );
    vi.spyOn(usersRepository, 'findByEmail').mockResolvedValue(null);
    vi.spyOn(usersRepository, 'create').mockResolvedValue({
      id: teacherUserId,
      email: 'edna@springfield.edu',
      role: 'teacher',
      schoolId: school1Id,
      firstName: 'Edna',
      lastName: 'Krabappel',
      phone: null,
      status: 'active',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });
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

    it('creates a teacher (201) for principal in own school', async () => {
      const app = createApp();
      vi.spyOn(schoolsRepository, 'findById').mockResolvedValue(sampleSchool);
      vi.spyOn(teachersRepository, 'findBySchoolAndEmployeeId').mockResolvedValue(null);
      vi.spyOn(teachersRepository, 'findBySchoolAndEmail').mockResolvedValue(null);
      vi.spyOn(teachersRepository, 'create').mockResolvedValue(sampleTeacher);

      const res = await request(app)
        .post(`/api/v1/schools/${school1Id}/teachers`)
        .set('Authorization', `Bearer ${ownSchoolPrincipalToken}`)
        .send({
          employeeId: 'EMP-001',
          firstName: 'Edna',
          lastName: 'Krabappel',
          email: 'edna@springfield.edu',
        });

      expect(res.status).toBe(201);
    });

    it('returns 403 when regular teacher attempts to create teacher', async () => {
      const app = createApp();

      const res = await request(app)
        .post(`/api/v1/schools/${school1Id}/teachers`)
        .set('Authorization', `Bearer ${ownSchoolTeacherToken}`)
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

    it('updates teacher for principal in own school (200)', async () => {
      const app = createApp();
      vi.spyOn(teachersRepository, 'findById').mockResolvedValue(sampleTeacher);
      vi.spyOn(teachersRepository, 'update').mockResolvedValue({
        ...sampleTeacher,
        firstName: 'Elizabeth',
      });

      const res = await request(app)
        .patch(`/api/v1/teachers/${sampleTeacher.id}`)
        .set('Authorization', `Bearer ${ownSchoolPrincipalToken}`)
        .send({ firstName: 'Elizabeth' });

      expect(res.status).toBe(200);
    });

    it('returns 403 when teacher attempts to update teacher', async () => {
      const app = createApp();

      const res = await request(app)
        .patch(`/api/v1/teachers/${sampleTeacher.id}`)
        .set('Authorization', `Bearer ${ownSchoolTeacherToken}`)
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

    it('soft-deletes teacher for principal in own school (204)', async () => {
      const app = createApp();
      vi.spyOn(teachersRepository, 'findById').mockResolvedValue(sampleTeacher);
      vi.spyOn(teachersRepository, 'softDelete').mockResolvedValue(true);

      const res = await request(app)
        .delete(`/api/v1/teachers/${sampleTeacher.id}`)
        .set('Authorization', `Bearer ${ownSchoolPrincipalToken}`);

      expect(res.status).toBe(204);
    });

    it('returns 409 Conflict when deleting teacher with active assignments', async () => {
      const app = createApp();
      vi.spyOn(teachersRepository, 'findById').mockResolvedValue(sampleTeacher);
      vi.spyOn(teacherAssignmentsRepository, 'hasActiveAssignmentsByTeacher').mockResolvedValue(
        true,
      );

      const res = await request(app)
        .delete(`/api/v1/teachers/${sampleTeacher.id}`)
        .set('Authorization', `Bearer ${ownSchoolAdminToken}`);

      expect(res.status).toBe(409);
    });

    it('returns 403 for regular teacher attempting to delete teacher', async () => {
      const app = createApp();

      const res = await request(app)
        .delete(`/api/v1/teachers/${sampleTeacher.id}`)
        .set('Authorization', `Bearer ${ownSchoolTeacherToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/v1/teachers/me/grades', () => {
    it('returns assigned grades for authenticated teacher (200)', async () => {
      const app = createApp();
      vi.spyOn(teachersRepository, 'findByUserId').mockResolvedValue(sampleTeacher);
      const mockGrades = [
        {
          id: '11111111-2222-3333-4444-555555555555',
          name: 'Grade 10 - Section A',
          code: 'G10-A',
          gradeNumber: 10,
          section: 'A',
          boardId: 'board-1',
          boardName: 'CBSE',
          isClassTeacher: true,
          totalAssignedSubjects: 2,
        },
      ];
      vi.spyOn(teachersRepository, 'findAssignedGradesByTeacherId').mockResolvedValue(mockGrades);

      const res = await request(app)
        .get('/api/v1/teachers/me/grades')
        .set('Authorization', `Bearer ${ownTeacherSelfToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual(mockGrades);
    });

    it('returns 403 for student attempting to access /me/grades', async () => {
      const app = createApp();

      const res = await request(app)
        .get('/api/v1/teachers/me/grades')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/v1/teachers/me/subjects', () => {
    it('returns all assigned subjects for authenticated teacher (200)', async () => {
      const app = createApp();
      vi.spyOn(teachersRepository, 'findByUserId').mockResolvedValue(sampleTeacher);
      const mockSubjects = [
        {
          id: 'sub-1',
          name: 'Mathematics',
          code: 'MATH101',
          description: 'Math',
          status: 'active',
          totalChapters: 5,
        },
      ];
      vi.spyOn(teachersRepository, 'findAllAssignedSubjectsByTeacher').mockResolvedValue(
        mockSubjects,
      );

      const res = await request(app)
        .get('/api/v1/teachers/me/subjects')
        .set('Authorization', `Bearer ${ownTeacherSelfToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual(mockSubjects);
    });
  });

  describe('GET /api/v1/teachers/:teacherId/grades', () => {
    it('returns assigned grades for teacher when queried by admin (200)', async () => {
      const app = createApp();
      vi.spyOn(teachersRepository, 'findById').mockResolvedValue(sampleTeacher);
      const mockGrades = [
        {
          id: '11111111-2222-3333-4444-555555555555',
          name: 'Grade 10 - Section A',
          code: 'G10-A',
          gradeNumber: 10,
          section: 'A',
          boardId: 'board-1',
          boardName: 'CBSE',
          isClassTeacher: false,
          totalAssignedSubjects: 1,
        },
      ];
      vi.spyOn(teachersRepository, 'findAssignedGradesByTeacherId').mockResolvedValue(mockGrades);

      const res = await request(app)
        .get(`/api/v1/teachers/${sampleTeacher.id}/grades`)
        .set('Authorization', `Bearer ${ownSchoolAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual(mockGrades);
    });

    it('returns 403 when teacher tries to query another teacher grades', async () => {
      const app = createApp();
      vi.spyOn(teachersRepository, 'findById').mockResolvedValue(sampleTeacher);

      const res = await request(app)
        .get(`/api/v1/teachers/${sampleTeacher.id}/grades`)
        .set('Authorization', `Bearer ${otherSchoolTeacherToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/v1/teachers/me/grades/:gradeId/students', () => {
    const gradeId = '33333333-3333-4333-a333-333333333333';
    const sampleGrade: Grade = {
      id: gradeId,
      schoolId: school1Id,
      boardId: 'board-1',
      name: 'Grade 10 - Section A',
      code: 'G10-A',
      gradeNumber: 10,
      section: 'A',
      capacity: 30,
      classTeacherId: null,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };

    const sampleStudent: Student = {
      id: 'student-1',
      schoolId: school1Id,
      boardId: 'board-1',
      gradeId,
      userId: null,
      admissionNumber: 'ADM-001',
      firstName: 'Bart',
      lastName: 'Simpson',
      dateOfBirth: null,
      gender: 'male',
      email: 'bart@simpson.edu',
      phone: null,
      guardianName: null,
      guardianPhone: null,
      guardianEmail: null,
      address: null,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };

    it('returns paginated students when teacher is assigned to that grade (200)', async () => {
      const app = createApp();
      vi.spyOn(teachersRepository, 'findByUserId').mockResolvedValue(sampleTeacher);
      vi.spyOn(gradesRepository, 'findById').mockResolvedValue(sampleGrade);
      vi.spyOn(teachersRepository, 'hasTeacherGradeAssignment').mockResolvedValue(true);
      vi.spyOn(studentsRepository, 'listByGrade').mockResolvedValue([sampleStudent]);

      const res = await request(app)
        .get(`/api/v1/teachers/me/grades/${gradeId}/students`)
        .set('Authorization', `Bearer ${ownTeacherSelfToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe(sampleStudent.id);
    });

    it('rejects with 403 when teacher is not assigned to that grade', async () => {
      const app = createApp();
      vi.spyOn(teachersRepository, 'findByUserId').mockResolvedValue(sampleTeacher);
      vi.spyOn(gradesRepository, 'findById').mockResolvedValue(sampleGrade);
      vi.spyOn(teachersRepository, 'hasTeacherGradeAssignment').mockResolvedValue(false);

      const res = await request(app)
        .get(`/api/v1/teachers/me/grades/${gradeId}/students`)
        .set('Authorization', `Bearer ${ownTeacherSelfToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/v1/teachers/me/students', () => {
    it('returns all students across assigned grades (200)', async () => {
      const app = createApp();
      vi.spyOn(teachersRepository, 'findByUserId').mockResolvedValue(sampleTeacher);
      vi.spyOn(teachersRepository, 'findAssignedGradesByTeacherId').mockResolvedValue([
        {
          id: 'grade-1',
          name: 'Grade 10',
          code: 'G10',
          gradeNumber: 10,
          section: 'A',
          boardId: 'board-1',
          boardName: 'CBSE',
          isClassTeacher: false,
          totalAssignedSubjects: 1,
        },
      ]);
      const sampleStudent: Student = {
        id: 'student-1',
        schoolId: school1Id,
        boardId: 'board-1',
        gradeId: 'grade-1',
        userId: null,
        admissionNumber: 'ADM-001',
        firstName: 'Bart',
        lastName: 'Simpson',
        dateOfBirth: null,
        gender: 'male',
        email: 'bart@simpson.edu',
        phone: null,
        guardianName: null,
        guardianPhone: null,
        guardianEmail: null,
        address: null,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };
      vi.spyOn(studentsRepository, 'listByGradeIds').mockResolvedValue([sampleStudent]);

      const res = await request(app)
        .get('/api/v1/teachers/me/students')
        .set('Authorization', `Bearer ${ownTeacherSelfToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });

    it('returns empty list when teacher has no assigned grades (200)', async () => {
      const app = createApp();
      vi.spyOn(teachersRepository, 'findByUserId').mockResolvedValue(sampleTeacher);
      vi.spyOn(teachersRepository, 'findAssignedGradesByTeacherId').mockResolvedValue([]);

      const res = await request(app)
        .get('/api/v1/teachers/me/students')
        .set('Authorization', `Bearer ${ownTeacherSelfToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
    });
  });
});
