import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../../app.js';
import { env } from '../../config/env.js';
import { schoolsRepository } from '../schools/schools.repository.js';
import { principalsRepository } from '../principals/principals.repository.js';
import { teachersRepository } from '../teachers/teachers.repository.js';
import { gradesRepository } from '../grades/grades.repository.js';
import { studentsRepository } from '../students/students.repository.js';
import {
  teacherAssignmentsRepository,
  type TeacherAssignmentDetail,
} from '../teacher-assignments/teacher-assignments.repository.js';
import { usersRepository } from '../users/users.repository.js';
import type { School } from '../../db/schema/schools.js';
import type { Principal } from '../../db/schema/principals.js';
import type { Teacher } from '../../db/schema/teachers.js';
import type { Grade } from '../../db/schema/grades.js';
import type { Student } from '../../db/schema/students.js';
import type { TeacherAssignment } from '../../db/schema/teacher-assignments.js';

describe('RBAC Fine-Grained Access Controls', () => {
  const school1Id = '11111111-1111-4111-a111-111111111111';
  const school2Id = '22222222-2222-4222-a222-222222222222';
  const grade1Id = '33333333-3333-4333-a333-333333333333';
  const teacher1Id = '44444444-4444-4444-a444-444444444444';
  const teacher2Id = '55555555-5555-4555-a555-555555555555';
  const student1Id = '66666666-6666-4666-a666-666666666666';

  const userTeacher1Id = 'user-teach-1';
  const userTeacher2Id = 'user-teach-2';
  const userStudent1Id = 'user-stu-1';
  const userStudent2Id = 'user-stu-2';
  const principal1UserId = '77777777-7777-4777-a777-777777777777';
  const principal2UserId = '88888888-8888-4888-a888-888888888888';

  const sampleSchool: School = {
    id: school1Id,
    name: 'Springfield Elementary',
    code: 'SPFLD',
    address: null,
    city: null,
    state: null,
    country: null,
    phone: null,
    email: null,
    website: null,
    logoUrl: null,
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const samplePrincipal: Principal = {
    id: 'prin-profile-1',
    schoolId: school1Id,
    userId: principal1UserId,
    employeeId: 'PRIN-001',
    firstName: 'Seymour',
    lastName: 'Skinner',
    email: 'skinner@springfield.edu',
    phone: null,
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const sampleGrade: Grade = {
    id: grade1Id,
    schoolId: school1Id,
    boardId: 'board-1',
    name: 'Grade 10 - Section A',
    code: 'G10-A',
    gradeNumber: 10,
    section: 'A',
    capacity: 40,
    classTeacherId: teacher1Id,
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const sampleTeacher1: Teacher = {
    id: teacher1Id,
    schoolId: school1Id,
    userId: userTeacher1Id,
    employeeId: 'EMP-001',
    firstName: 'Edna',
    lastName: 'Krabappel',
    email: 'edna@springfield.edu',
    phone: null,
    joiningDate: new Date(),
    qualification: 'M.Ed',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const sampleTeacher2: Teacher = {
    id: teacher2Id,
    schoolId: school1Id,
    userId: userTeacher2Id,
    employeeId: 'EMP-002',
    firstName: 'Elizabeth',
    lastName: 'Hoover',
    email: 'hoover@springfield.edu',
    phone: null,
    joiningDate: new Date(),
    qualification: 'B.Ed',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const sampleStudent1: Student = {
    id: student1Id,
    schoolId: school1Id,
    boardId: 'board-1',
    gradeId: grade1Id,
    userId: userStudent1Id,
    admissionNumber: 'ADM-001',
    firstName: 'Bart',
    lastName: 'Simpson',
    dateOfBirth: new Date(),
    gender: 'male',
    email: 'bart@simpson.edu',
    phone: null,
    guardianName: 'Homer',
    guardianPhone: null,
    guardianEmail: null,
    address: null,
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const sampleAssignment: TeacherAssignment = {
    id: 'assign-1',
    schoolId: school1Id,
    teacherId: teacher1Id,
    gradeId: grade1Id,
    subjectId: 'subj-1',
    assignedBy: null,
    status: 'active',
    effectiveDate: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const sampleAssignmentDetail: TeacherAssignmentDetail = {
    ...sampleAssignment,
    teacherFirstName: sampleTeacher1.firstName,
    teacherLastName: sampleTeacher1.lastName,
    teacherEmail: sampleTeacher1.email,
    teacherEmployeeId: sampleTeacher1.employeeId,
    gradeName: sampleGrade.name,
    gradeCode: sampleGrade.code,
    subjectName: 'Math',
    subjectCode: 'MATH',
  };

  // Auth tokens
  const superAdminToken = jwt.sign(
    { sub: 'user-sa', role: 'super_admin', schoolId: null, jti: 'sa' },
    env.JWT_ACCESS_SECRET,
  );
  const ownSchoolAdminToken = jwt.sign(
    { sub: 'user-admin-1', role: 'admin', schoolId: school1Id, jti: 'a1' },
    env.JWT_ACCESS_SECRET,
  );
  const otherSchoolAdminToken = jwt.sign(
    { sub: 'user-admin-2', role: 'admin', schoolId: school2Id, jti: 'a2' },
    env.JWT_ACCESS_SECRET,
  );
  const ownSchoolPrincipalToken = jwt.sign(
    { sub: principal1UserId, role: 'principal', schoolId: school1Id, jti: 'p1' },
    env.JWT_ACCESS_SECRET,
  );
  const otherSchoolPrincipalToken = jwt.sign(
    { sub: principal2UserId, role: 'principal', schoolId: school2Id, jti: 'p2' },
    env.JWT_ACCESS_SECRET,
  );
  const ownSchoolClassTeacherToken = jwt.sign(
    { sub: userTeacher1Id, role: 'class_teacher', schoolId: school1Id, jti: 'ct1' },
    env.JWT_ACCESS_SECRET,
  );
  const otherClassTeacherToken = jwt.sign(
    { sub: userTeacher2Id, role: 'class_teacher', schoolId: school1Id, jti: 'ct2' },
    env.JWT_ACCESS_SECRET,
  );
  const ownTeacherSelfToken = jwt.sign(
    { sub: userTeacher1Id, role: 'teacher', schoolId: school1Id, jti: 't1' },
    env.JWT_ACCESS_SECRET,
  );
  const otherTeacherToken = jwt.sign(
    { sub: userTeacher2Id, role: 'teacher', schoolId: school1Id, jti: 't2' },
    env.JWT_ACCESS_SECRET,
  );
  const studentSelfToken = jwt.sign(
    { sub: userStudent1Id, role: 'student', schoolId: school1Id, jti: 's1' },
    env.JWT_ACCESS_SECRET,
  );
  const otherStudentToken = jwt.sign(
    { sub: userStudent2Id, role: 'student', schoolId: school1Id, jti: 's2' },
    env.JWT_ACCESS_SECRET,
  );

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Principal Scope Policies', () => {
    it('allows own-school principal to view school principal profile (200)', async () => {
      const app = createApp();
      vi.spyOn(schoolsRepository, 'findById').mockResolvedValue(sampleSchool);
      vi.spyOn(principalsRepository, 'findBySchoolId').mockResolvedValue(samplePrincipal);

      const res = await request(app)
        .get(`/api/v1/schools/${school1Id}/principal`)
        .set('Authorization', `Bearer ${ownSchoolPrincipalToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe(samplePrincipal.email);
    });

    it('rejects principal from another school accessing principal profile (403)', async () => {
      const app = createApp();
      vi.spyOn(schoolsRepository, 'findById').mockResolvedValue(sampleSchool);

      const res = await request(app)
        .get(`/api/v1/schools/${school1Id}/principal`)
        .set('Authorization', `Bearer ${otherSchoolPrincipalToken}`);

      expect(res.status).toBe(403);
    });

    it('allows super_admin to view school principal profile across schools (200)', async () => {
      const app = createApp();
      vi.spyOn(schoolsRepository, 'findById').mockResolvedValue(sampleSchool);
      vi.spyOn(principalsRepository, 'findBySchoolId').mockResolvedValue(samplePrincipal);

      const res = await request(app)
        .get(`/api/v1/schools/${school1Id}/principal`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe(samplePrincipal.email);
    });

    it('rejects admin from another school from upserting principal profile (403)', async () => {
      const app = createApp();

      const res = await request(app)
        .put(`/api/v1/schools/${school1Id}/principal`)
        .set('Authorization', `Bearer ${otherSchoolAdminToken}`)
        .send({
          userId: principal1UserId,
          employeeId: 'PRIN-001',
          firstName: 'Seymour',
          lastName: 'Skinner',
          email: 'skinner@springfield.edu',
        });

      expect(res.status).toBe(403);
    });

    it('allows own-school admin to upsert principal profile (200)', async () => {
      const app = createApp();
      vi.spyOn(schoolsRepository, 'findById').mockResolvedValue(sampleSchool);
      vi.spyOn(usersRepository, 'findById').mockResolvedValue({
        id: principal1UserId,
        email: 'skinner@springfield.edu',
        role: 'principal',
        schoolId: school1Id,
        firstName: 'Seymour',
        lastName: 'Skinner',
        phone: null,
        status: 'active',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      });
      vi.spyOn(principalsRepository, 'findByUserId').mockResolvedValue(null);
      vi.spyOn(principalsRepository, 'upsert').mockResolvedValue(samplePrincipal);

      const res = await request(app)
        .put(`/api/v1/schools/${school1Id}/principal`)
        .set('Authorization', `Bearer ${ownSchoolAdminToken}`)
        .send({
          userId: principal1UserId,
          employeeId: 'PRIN-001',
          firstName: 'Seymour',
          lastName: 'Skinner',
          email: 'skinner@springfield.edu',
        });

      expect(res.status).toBe(200);
    });

    it('rejects principal from upserting principal profile (403)', async () => {
      const app = createApp();

      const res = await request(app)
        .put(`/api/v1/schools/${school1Id}/principal`)
        .set('Authorization', `Bearer ${ownSchoolPrincipalToken}`)
        .send({
          userId: 'user-prin-1',
          employeeId: 'PRIN-001',
          firstName: 'Seymour',
          lastName: 'Skinner',
          email: 'skinner@springfield.edu',
        });

      expect(res.status).toBe(403);
    });

    it('allows own-school principal to create a teacher (201)', async () => {
      const app = createApp();
      vi.spyOn(schoolsRepository, 'findById').mockResolvedValue(sampleSchool);
      vi.spyOn(teachersRepository, 'findBySchoolAndEmployeeId').mockResolvedValue(null);
      vi.spyOn(teachersRepository, 'findBySchoolAndEmail').mockResolvedValue(null);
      vi.spyOn(teachersRepository, 'create').mockResolvedValue(sampleTeacher1);

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

    it('rejects principal from another school creating a teacher (403)', async () => {
      const app = createApp();
      vi.spyOn(schoolsRepository, 'findById').mockResolvedValue(sampleSchool);

      const res = await request(app)
        .post(`/api/v1/schools/${school1Id}/teachers`)
        .set('Authorization', `Bearer ${otherSchoolPrincipalToken}`)
        .send({
          employeeId: 'EMP-001',
          firstName: 'Edna',
          lastName: 'Krabappel',
          email: 'edna@springfield.edu',
        });

      expect(res.status).toBe(403);
    });
  });

  describe('Class-Teacher Scope Policies', () => {
    it('allows own-school principal/admin to assign class teacher (200)', async () => {
      const app = createApp();
      vi.spyOn(gradesRepository, 'findById').mockResolvedValue(sampleGrade);
      vi.spyOn(teachersRepository, 'findById').mockResolvedValue(sampleTeacher1);
      vi.spyOn(gradesRepository, 'setClassTeacher').mockResolvedValue(sampleGrade);

      const res = await request(app)
        .put(`/api/v1/grades/${grade1Id}/class-teacher`)
        .set('Authorization', `Bearer ${ownSchoolPrincipalToken}`)
        .send({ teacherId: teacher1Id });

      expect(res.status).toBe(200);
    });

    it('rejects regular teacher from assigning class teacher (403)', async () => {
      const app = createApp();

      const res = await request(app)
        .put(`/api/v1/grades/${grade1Id}/class-teacher`)
        .set('Authorization', `Bearer ${ownTeacherSelfToken}`)
        .send({ teacherId: teacher1Id });

      expect(res.status).toBe(403);
    });

    it('allows assigned class_teacher to read students in their grade (200)', async () => {
      const app = createApp();
      vi.spyOn(gradesRepository, 'findById').mockResolvedValue(sampleGrade);
      vi.spyOn(teachersRepository, 'findByUserId').mockResolvedValue(sampleTeacher1);
      vi.spyOn(studentsRepository, 'listByGrade').mockResolvedValue([sampleStudent1]);

      const res = await request(app)
        .get(`/api/v1/grades/${grade1Id}/students`)
        .set('Authorization', `Bearer ${ownSchoolClassTeacherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });

    it('rejects class_teacher from reading students of an unassigned grade (403)', async () => {
      const app = createApp();
      vi.spyOn(gradesRepository, 'findById').mockResolvedValue(sampleGrade);
      vi.spyOn(teachersRepository, 'findByUserId').mockResolvedValue(sampleTeacher2);

      const res = await request(app)
        .get(`/api/v1/grades/${grade1Id}/students`)
        .set('Authorization', `Bearer ${otherClassTeacherToken}`);

      expect(res.status).toBe(403);
    });

    it('allows assigned class_teacher to view assignments for their grade (200)', async () => {
      const app = createApp();
      vi.spyOn(gradesRepository, 'findById').mockResolvedValue(sampleGrade);
      vi.spyOn(teachersRepository, 'findByUserId').mockResolvedValue(sampleTeacher1);
      vi.spyOn(teacherAssignmentsRepository, 'listByGrade').mockResolvedValue([
        sampleAssignmentDetail,
      ]);

      const res = await request(app)
        .get(`/api/v1/grades/${grade1Id}/teachers`)
        .set('Authorization', `Bearer ${ownSchoolClassTeacherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });

    it('rejects class_teacher from viewing assignments of unassigned grade (403)', async () => {
      const app = createApp();
      vi.spyOn(gradesRepository, 'findById').mockResolvedValue(sampleGrade);
      vi.spyOn(teachersRepository, 'findByUserId').mockResolvedValue(sampleTeacher2);

      const res = await request(app)
        .get(`/api/v1/grades/${grade1Id}/teachers`)
        .set('Authorization', `Bearer ${otherClassTeacherToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('Teacher Scope Policies', () => {
    it('allows teacher to view their own profile (200)', async () => {
      const app = createApp();
      vi.spyOn(teachersRepository, 'findById').mockResolvedValue(sampleTeacher1);

      const res = await request(app)
        .get(`/api/v1/teachers/${teacher1Id}`)
        .set('Authorization', `Bearer ${ownTeacherSelfToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(teacher1Id);
    });

    it('rejects teacher from viewing another teacher profile (403)', async () => {
      const app = createApp();
      vi.spyOn(teachersRepository, 'findById').mockResolvedValue(sampleTeacher1);

      const res = await request(app)
        .get(`/api/v1/teachers/${teacher1Id}`)
        .set('Authorization', `Bearer ${otherTeacherToken}`);

      expect(res.status).toBe(403);
    });

    it('allows teacher to view their own assignments (200)', async () => {
      const app = createApp();
      vi.spyOn(teachersRepository, 'findById').mockResolvedValue(sampleTeacher1);
      vi.spyOn(teacherAssignmentsRepository, 'listByTeacher').mockResolvedValue([
        sampleAssignmentDetail,
      ]);

      const res = await request(app)
        .get(`/api/v1/teachers/${teacher1Id}/assignments`)
        .set('Authorization', `Bearer ${ownTeacherSelfToken}`);

      expect(res.status).toBe(200);
    });

    it('rejects teacher from viewing another teacher assignments (403)', async () => {
      const app = createApp();
      vi.spyOn(teachersRepository, 'findById').mockResolvedValue(sampleTeacher1);

      const res = await request(app)
        .get(`/api/v1/teachers/${teacher1Id}/assignments`)
        .set('Authorization', `Bearer ${otherTeacherToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('Student Scope Policies', () => {
    it('allows student to view their own student profile (200)', async () => {
      const app = createApp();
      vi.spyOn(studentsRepository, 'findById').mockResolvedValue(sampleStudent1);

      const res = await request(app)
        .get(`/api/v1/students/${student1Id}`)
        .set('Authorization', `Bearer ${studentSelfToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(student1Id);
    });

    it('rejects student from viewing another student profile (403)', async () => {
      const app = createApp();
      vi.spyOn(studentsRepository, 'findById').mockResolvedValue(sampleStudent1);

      const res = await request(app)
        .get(`/api/v1/students/${student1Id}`)
        .set('Authorization', `Bearer ${otherStudentToken}`);

      expect(res.status).toBe(403);
    });
  });
});
