import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TeacherAssignmentsService } from './teacher-assignments.service.js';
import { TeacherAssignmentsRepository } from './teacher-assignments.repository.js';
import { TeachersRepository } from '../teachers/teachers.repository.js';
import { GradesRepository } from '../grades/grades.repository.js';
import { SubjectsRepository } from '../subjects/subjects.repository.js';
import type { TeacherAssignment } from '../../db/schema/teacher-assignments.js';
import type { Teacher } from '../../db/schema/teachers.js';
import type { Grade } from '../../db/schema/grades.js';
import type { Subject, GradeSubject } from '../../db/schema/subjects.js';
import {
  ConflictError,
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} from '../../lib/app-error.js';

describe('TeacherAssignmentsService', () => {
  let service: TeacherAssignmentsService;
  let mockAssignmentsRepo: TeacherAssignmentsRepository;
  let mockTeachersRepo: TeachersRepository;
  let mockGradesRepo: GradesRepository;
  let mockSubjectsRepo: SubjectsRepository;

  const school1Id = '11111111-1111-4111-a111-111111111111';
  const school2Id = '22222222-2222-4222-a222-222222222222';
  const teacherId = '33333333-3333-4333-a333-333333333333';
  const gradeId = '44444444-4444-4444-a444-444444444444';
  const subjectId = '55555555-5555-4555-a555-555555555555';
  const assignmentId = '66666666-6666-4666-a666-666666666666';

  const mockTeacher: Teacher = {
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
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    deletedAt: null,
  };

  const mockGrade: Grade = {
    id: gradeId,
    schoolId: school1Id,
    boardId: '77777777-7777-4777-a777-777777777777',
    name: 'Grade 10 - Section A',
    code: 'G10-A',
    gradeNumber: 10,
    section: 'A',
    capacity: 40,
    status: 'active',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    deletedAt: null,
  };

  const mockSubject: Subject = {
    id: subjectId,
    schoolId: school1Id,
    name: 'Mathematics',
    code: 'MATH',
    description: null,
    status: 'active',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    deletedAt: null,
  };

  const mockGradeSubject: GradeSubject = {
    id: '88888888-8888-4888-a888-888888888888',
    schoolId: school1Id,
    gradeId,
    subjectId,
    status: 'active',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  };

  const mockAssignment: TeacherAssignment = {
    id: assignmentId,
    schoolId: school1Id,
    teacherId,
    gradeId,
    subjectId,
    assignedBy: null,
    status: 'active',
    effectiveDate: new Date('2026-02-01T00:00:00Z'),
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    deletedAt: null,
  };

  beforeEach(() => {
    mockAssignmentsRepo = new TeacherAssignmentsRepository();
    mockTeachersRepo = new TeachersRepository();
    mockGradesRepo = new GradesRepository();
    mockSubjectsRepo = new SubjectsRepository();
    service = new TeacherAssignmentsService(
      mockAssignmentsRepo,
      mockTeachersRepo,
      mockGradesRepo,
      mockSubjectsRepo,
    );
  });

  describe('createAssignment', () => {
    it('creates an assignment successfully when all entities are active and compatible', async () => {
      vi.spyOn(mockTeachersRepo, 'findById').mockResolvedValue(mockTeacher);
      vi.spyOn(mockGradesRepo, 'findById').mockResolvedValue(mockGrade);
      vi.spyOn(mockSubjectsRepo, 'findById').mockResolvedValue(mockSubject);
      vi.spyOn(mockSubjectsRepo, 'findGradeSubject').mockResolvedValue(mockGradeSubject);
      vi.spyOn(mockAssignmentsRepo, 'findByTeacherGradeSubject').mockResolvedValue(null);
      const createSpy = vi.spyOn(mockAssignmentsRepo, 'create').mockResolvedValue(mockAssignment);

      const result = await service.createAssignment(
        { teacherId, gradeId, subjectId, status: 'active' },
        'user-admin',
        school1Id,
        'admin',
      );

      expect(result).toEqual(mockAssignment);
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          schoolId: school1Id,
          teacherId,
          gradeId,
          subjectId,
          assignedBy: 'user-admin',
        }),
      );
    });

    it('rejects assignment if teacher not found', async () => {
      vi.spyOn(mockTeachersRepo, 'findById').mockResolvedValue(null);

      await expect(
        service.createAssignment(
          { teacherId, gradeId, subjectId },
          'user-admin',
          school1Id,
          'admin',
        ),
      ).rejects.toThrow(NotFoundError);
    });

    it('rejects assignment if teacher is inactive', async () => {
      vi.spyOn(mockTeachersRepo, 'findById').mockResolvedValue({
        ...mockTeacher,
        status: 'inactive',
      });

      await expect(
        service.createAssignment(
          { teacherId, gradeId, subjectId },
          'user-admin',
          school1Id,
          'admin',
        ),
      ).rejects.toThrow(BadRequestError);
    });

    it('rejects assignment if grade not found', async () => {
      vi.spyOn(mockTeachersRepo, 'findById').mockResolvedValue(mockTeacher);
      vi.spyOn(mockGradesRepo, 'findById').mockResolvedValue(null);

      await expect(
        service.createAssignment(
          { teacherId, gradeId, subjectId },
          'user-admin',
          school1Id,
          'admin',
        ),
      ).rejects.toThrow(NotFoundError);
    });

    it('rejects assignment if grade is inactive', async () => {
      vi.spyOn(mockTeachersRepo, 'findById').mockResolvedValue(mockTeacher);
      vi.spyOn(mockGradesRepo, 'findById').mockResolvedValue({ ...mockGrade, status: 'inactive' });

      await expect(
        service.createAssignment(
          { teacherId, gradeId, subjectId },
          'user-admin',
          school1Id,
          'admin',
        ),
      ).rejects.toThrow(BadRequestError);
    });

    it('rejects assignment if subject not found', async () => {
      vi.spyOn(mockTeachersRepo, 'findById').mockResolvedValue(mockTeacher);
      vi.spyOn(mockGradesRepo, 'findById').mockResolvedValue(mockGrade);
      vi.spyOn(mockSubjectsRepo, 'findById').mockResolvedValue(null);

      await expect(
        service.createAssignment(
          { teacherId, gradeId, subjectId },
          'user-admin',
          school1Id,
          'admin',
        ),
      ).rejects.toThrow(NotFoundError);
    });

    it('rejects assignment if subject is inactive', async () => {
      vi.spyOn(mockTeachersRepo, 'findById').mockResolvedValue(mockTeacher);
      vi.spyOn(mockGradesRepo, 'findById').mockResolvedValue(mockGrade);
      vi.spyOn(mockSubjectsRepo, 'findById').mockResolvedValue({
        ...mockSubject,
        status: 'inactive',
      });

      await expect(
        service.createAssignment(
          { teacherId, gradeId, subjectId },
          'user-admin',
          school1Id,
          'admin',
        ),
      ).rejects.toThrow(BadRequestError);
    });

    it('throws ForbiddenError if caller admin is from another school', async () => {
      vi.spyOn(mockTeachersRepo, 'findById').mockResolvedValue(mockTeacher);
      vi.spyOn(mockGradesRepo, 'findById').mockResolvedValue(mockGrade);
      vi.spyOn(mockSubjectsRepo, 'findById').mockResolvedValue(mockSubject);

      await expect(
        service.createAssignment(
          { teacherId, gradeId, subjectId },
          'user-admin2',
          school2Id,
          'admin',
        ),
      ).rejects.toThrow(ForbiddenError);
    });

    it('rejects assignment if entities belong to different schools', async () => {
      vi.spyOn(mockTeachersRepo, 'findById').mockResolvedValue(mockTeacher);
      vi.spyOn(mockGradesRepo, 'findById').mockResolvedValue({ ...mockGrade, schoolId: school2Id });
      vi.spyOn(mockSubjectsRepo, 'findById').mockResolvedValue(mockSubject);

      await expect(
        service.createAssignment({ teacherId, gradeId, subjectId }, 'user-sa', null, 'super_admin'),
      ).rejects.toThrow(BadRequestError);
    });

    it('rejects assignment if subject is not assigned to the grade', async () => {
      vi.spyOn(mockTeachersRepo, 'findById').mockResolvedValue(mockTeacher);
      vi.spyOn(mockGradesRepo, 'findById').mockResolvedValue(mockGrade);
      vi.spyOn(mockSubjectsRepo, 'findById').mockResolvedValue(mockSubject);
      vi.spyOn(mockSubjectsRepo, 'findGradeSubject').mockResolvedValue(null);

      await expect(
        service.createAssignment(
          { teacherId, gradeId, subjectId },
          'user-admin',
          school1Id,
          'admin',
        ),
      ).rejects.toThrow(BadRequestError);
    });

    it('rejects duplicate assignment', async () => {
      vi.spyOn(mockTeachersRepo, 'findById').mockResolvedValue(mockTeacher);
      vi.spyOn(mockGradesRepo, 'findById').mockResolvedValue(mockGrade);
      vi.spyOn(mockSubjectsRepo, 'findById').mockResolvedValue(mockSubject);
      vi.spyOn(mockSubjectsRepo, 'findGradeSubject').mockResolvedValue(mockGradeSubject);
      vi.spyOn(mockAssignmentsRepo, 'findByTeacherGradeSubject').mockResolvedValue(mockAssignment);

      await expect(
        service.createAssignment(
          { teacherId, gradeId, subjectId },
          'user-admin',
          school1Id,
          'admin',
        ),
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('listAssignments', () => {
    it('returns paginated assignments for school admin', async () => {
      vi.spyOn(mockAssignmentsRepo, 'list').mockResolvedValue([mockAssignment]);

      const result = await service.listAssignments({ limit: 10 }, school1Id, 'admin');

      expect(result.data).toHaveLength(1);
      expect(result.pageInfo.hasMore).toBe(false);
    });

    it('throws ForbiddenError if non-super_admin requests another school', async () => {
      await expect(
        service.listAssignments({ schoolId: school2Id }, school1Id, 'admin'),
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('getAssignmentById', () => {
    it('returns assignment for super_admin', async () => {
      vi.spyOn(mockAssignmentsRepo, 'findById').mockResolvedValue(mockAssignment);

      const result = await service.getAssignmentById(assignmentId, null, 'super_admin');
      expect(result).toEqual(mockAssignment);
    });

    it('throws ForbiddenError for admin of another school', async () => {
      vi.spyOn(mockAssignmentsRepo, 'findById').mockResolvedValue(mockAssignment);

      await expect(service.getAssignmentById(assignmentId, school2Id, 'admin')).rejects.toThrow(
        ForbiddenError,
      );
    });

    it('throws NotFoundError if assignment does not exist', async () => {
      vi.spyOn(mockAssignmentsRepo, 'findById').mockResolvedValue(null);

      await expect(service.getAssignmentById('non-existent', school1Id, 'admin')).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe('getAssignmentsByTeacher', () => {
    it('returns assignments for a valid teacher in same school', async () => {
      vi.spyOn(mockTeachersRepo, 'findById').mockResolvedValue(mockTeacher);
      vi.spyOn(mockAssignmentsRepo, 'listByTeacher').mockResolvedValue([mockAssignment]);

      const result = await service.getAssignmentsByTeacher(teacherId, school1Id, 'admin');
      expect(result).toHaveLength(1);
    });

    it('throws ForbiddenError if teacher belongs to another school', async () => {
      vi.spyOn(mockTeachersRepo, 'findById').mockResolvedValue(mockTeacher);

      await expect(service.getAssignmentsByTeacher(teacherId, school2Id, 'admin')).rejects.toThrow(
        ForbiddenError,
      );
    });
  });

  describe('getTeachersByGrade', () => {
    it('returns teachers for a grade in same school', async () => {
      vi.spyOn(mockGradesRepo, 'findById').mockResolvedValue(mockGrade);
      vi.spyOn(mockAssignmentsRepo, 'listByGrade').mockResolvedValue([mockAssignment]);

      const result = await service.getTeachersByGrade(gradeId, school1Id, 'admin');
      expect(result).toHaveLength(1);
    });

    it('throws ForbiddenError if grade belongs to another school', async () => {
      vi.spyOn(mockGradesRepo, 'findById').mockResolvedValue(mockGrade);

      await expect(service.getTeachersByGrade(gradeId, school2Id, 'admin')).rejects.toThrow(
        ForbiddenError,
      );
    });
  });

  describe('getTeachersBySubject', () => {
    it('returns teachers for a subject in same school', async () => {
      vi.spyOn(mockSubjectsRepo, 'findById').mockResolvedValue(mockSubject);
      vi.spyOn(mockAssignmentsRepo, 'listBySubject').mockResolvedValue([mockAssignment]);

      const result = await service.getTeachersBySubject(subjectId, school1Id, 'admin');
      expect(result).toHaveLength(1);
    });

    it('throws ForbiddenError if subject belongs to another school', async () => {
      vi.spyOn(mockSubjectsRepo, 'findById').mockResolvedValue(mockSubject);

      await expect(service.getTeachersBySubject(subjectId, school2Id, 'admin')).rejects.toThrow(
        ForbiddenError,
      );
    });
  });

  describe('updateAssignment', () => {
    it('updates assignment successfully', async () => {
      vi.spyOn(mockAssignmentsRepo, 'findById').mockResolvedValue(mockAssignment);
      const updated = { ...mockAssignment, status: 'inactive' as const };
      vi.spyOn(mockAssignmentsRepo, 'update').mockResolvedValue(updated);

      const result = await service.updateAssignment(
        assignmentId,
        { status: 'inactive' },
        school1Id,
        'admin',
      );

      expect(result.status).toBe('inactive');
    });

    it('throws ForbiddenError when modifying assignment from another school', async () => {
      vi.spyOn(mockAssignmentsRepo, 'findById').mockResolvedValue(mockAssignment);

      await expect(
        service.updateAssignment(assignmentId, { status: 'inactive' }, school2Id, 'admin'),
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('deleteAssignment', () => {
    it('soft deletes assignment successfully', async () => {
      vi.spyOn(mockAssignmentsRepo, 'findById').mockResolvedValue(mockAssignment);
      const deleteSpy = vi.spyOn(mockAssignmentsRepo, 'softDelete').mockResolvedValue(true);

      await service.deleteAssignment(assignmentId, school1Id, 'admin');
      expect(deleteSpy).toHaveBeenCalledWith(assignmentId);
    });

    it('throws ForbiddenError when deleting assignment from another school', async () => {
      vi.spyOn(mockAssignmentsRepo, 'findById').mockResolvedValue(mockAssignment);

      await expect(service.deleteAssignment(assignmentId, school2Id, 'admin')).rejects.toThrow(
        ForbiddenError,
      );
    });
  });
});
