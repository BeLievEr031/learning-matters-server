import { describe, it, expect } from 'vitest';
import { users } from './schema/users.js';
import { refreshTokens } from './schema/refresh-tokens.js';
import { schools } from './schema/schools.js';
import { boards } from './schema/boards.js';
import { grades } from './schema/grades.js';
import { subjects, gradeSubjects } from './schema/subjects.js';
import { teachers } from './schema/teachers.js';
import { students } from './schema/students.js';
import { teacherAssignments } from './schema/teacher-assignments.js';
import { principals } from './schema/principals.js';
import { seedDatabase } from './seed.js';
import { env } from '../config/env.js';

describe('Database Schema & Seed', () => {
  it('defines users schema with expected columns', () => {
    expect(users.id).toBeDefined();
    expect(users.email).toBeDefined();
    expect(users.passwordHash).toBeDefined();
    expect(users.role).toBeDefined();
    expect(users.schoolId).toBeDefined();
    expect(users.isActive).toBeDefined();
    expect(users.createdAt).toBeDefined();
    expect(users.updatedAt).toBeDefined();
    expect(users.deletedAt).toBeDefined();
  });

  it('defines refresh_tokens schema with relations and indexes', () => {
    expect(refreshTokens.id).toBeDefined();
    expect(refreshTokens.userId).toBeDefined();
    expect(refreshTokens.tokenHash).toBeDefined();
    expect(refreshTokens.familyId).toBeDefined();
    expect(refreshTokens.expiresAt).toBeDefined();
    expect(refreshTokens.revokedAt).toBeDefined();
    expect(refreshTokens.userAgent).toBeDefined();
    expect(refreshTokens.ip).toBeDefined();
  });

  it('defines schools schema with expected columns', () => {
    expect(schools.id).toBeDefined();
    expect(schools.name).toBeDefined();
    expect(schools.code).toBeDefined();
    expect(schools.address).toBeDefined();
    expect(schools.city).toBeDefined();
    expect(schools.state).toBeDefined();
    expect(schools.country).toBeDefined();
    expect(schools.phone).toBeDefined();
    expect(schools.email).toBeDefined();
    expect(schools.website).toBeDefined();
    expect(schools.status).toBeDefined();
    expect(schools.createdAt).toBeDefined();
    expect(schools.updatedAt).toBeDefined();
    expect(schools.deletedAt).toBeDefined();
  });

  it('defines boards schema with expected columns', () => {
    expect(boards.id).toBeDefined();
    expect(boards.schoolId).toBeDefined();
    expect(boards.name).toBeDefined();
    expect(boards.code).toBeDefined();
    expect(boards.description).toBeDefined();
    expect(boards.status).toBeDefined();
    expect(boards.createdAt).toBeDefined();
    expect(boards.updatedAt).toBeDefined();
    expect(boards.deletedAt).toBeDefined();
  });

  it('defines grades schema with expected columns', () => {
    expect(grades.id).toBeDefined();
    expect(grades.schoolId).toBeDefined();
    expect(grades.boardId).toBeDefined();
    expect(grades.name).toBeDefined();
    expect(grades.code).toBeDefined();
    expect(grades.gradeNumber).toBeDefined();
    expect(grades.section).toBeDefined();
    expect(grades.capacity).toBeDefined();
    expect(grades.classTeacherId).toBeDefined();
    expect(grades.status).toBeDefined();
    expect(grades.createdAt).toBeDefined();
    expect(grades.updatedAt).toBeDefined();
    expect(grades.deletedAt).toBeDefined();
  });

  it('defines subjects and grade_subjects schema with expected columns', () => {
    expect(subjects.id).toBeDefined();
    expect(subjects.schoolId).toBeDefined();
    expect(subjects.name).toBeDefined();
    expect(subjects.code).toBeDefined();
    expect(subjects.description).toBeDefined();
    expect(subjects.status).toBeDefined();
    expect(subjects.createdAt).toBeDefined();
    expect(subjects.updatedAt).toBeDefined();
    expect(subjects.deletedAt).toBeDefined();

    expect(gradeSubjects.id).toBeDefined();
    expect(gradeSubjects.schoolId).toBeDefined();
    expect(gradeSubjects.gradeId).toBeDefined();
    expect(gradeSubjects.subjectId).toBeDefined();
    expect(gradeSubjects.status).toBeDefined();
    expect(gradeSubjects.createdAt).toBeDefined();
    expect(gradeSubjects.updatedAt).toBeDefined();
  });

  it('defines teachers schema with expected columns', () => {
    expect(teachers.id).toBeDefined();
    expect(teachers.schoolId).toBeDefined();
    expect(teachers.userId).toBeDefined();
    expect(teachers.employeeId).toBeDefined();
    expect(teachers.firstName).toBeDefined();
    expect(teachers.lastName).toBeDefined();
    expect(teachers.email).toBeDefined();
    expect(teachers.phone).toBeDefined();
    expect(teachers.joiningDate).toBeDefined();
    expect(teachers.qualification).toBeDefined();
    expect(teachers.status).toBeDefined();
    expect(teachers.createdAt).toBeDefined();
    expect(teachers.updatedAt).toBeDefined();
    expect(teachers.deletedAt).toBeDefined();
  });

  it('defines students schema with expected columns', () => {
    expect(students.id).toBeDefined();
    expect(students.schoolId).toBeDefined();
    expect(students.boardId).toBeDefined();
    expect(students.gradeId).toBeDefined();
    expect(students.userId).toBeDefined();
    expect(students.admissionNumber).toBeDefined();
    expect(students.firstName).toBeDefined();
    expect(students.lastName).toBeDefined();
    expect(students.dateOfBirth).toBeDefined();
    expect(students.gender).toBeDefined();
    expect(students.email).toBeDefined();
    expect(students.phone).toBeDefined();
    expect(students.guardianName).toBeDefined();
    expect(students.guardianPhone).toBeDefined();
    expect(students.guardianEmail).toBeDefined();
    expect(students.address).toBeDefined();
    expect(students.status).toBeDefined();
    expect(students.createdAt).toBeDefined();
    expect(students.updatedAt).toBeDefined();
    expect(students.deletedAt).toBeDefined();
  });

  it('defines teacher_assignments schema with expected columns', () => {
    expect(teacherAssignments.id).toBeDefined();
    expect(teacherAssignments.schoolId).toBeDefined();
    expect(teacherAssignments.teacherId).toBeDefined();
    expect(teacherAssignments.gradeId).toBeDefined();
    expect(teacherAssignments.subjectId).toBeDefined();
    expect(teacherAssignments.assignedBy).toBeDefined();
    expect(teacherAssignments.status).toBeDefined();
    expect(teacherAssignments.effectiveDate).toBeDefined();
    expect(teacherAssignments.createdAt).toBeDefined();
    expect(teacherAssignments.updatedAt).toBeDefined();
    expect(teacherAssignments.deletedAt).toBeDefined();
  });

  it('defines principals schema with expected columns', () => {
    expect(principals.id).toBeDefined();
    expect(principals.schoolId).toBeDefined();
    expect(principals.userId).toBeDefined();
    expect(principals.employeeId).toBeDefined();
    expect(principals.firstName).toBeDefined();
    expect(principals.lastName).toBeDefined();
    expect(principals.email).toBeDefined();
    expect(principals.phone).toBeDefined();
    expect(principals.status).toBeDefined();
    expect(principals.createdAt).toBeDefined();
    expect(principals.updatedAt).toBeDefined();
  });

  it('seed refuses to run when NODE_ENV is production', async () => {
    const originalEnv = env.NODE_ENV;
    (env as { NODE_ENV: string }).NODE_ENV = 'production';

    await expect(seedDatabase()).rejects.toThrow('Cannot seed database in production');

    (env as { NODE_ENV: string }).NODE_ENV = originalEnv;
  });
});
