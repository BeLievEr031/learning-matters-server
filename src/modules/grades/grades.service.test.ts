import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GradesService } from './grades.service.js';
import { GradesRepository } from './grades.repository.js';
import { BoardsRepository } from '../boards/boards.repository.js';
import { TeachersRepository } from '../teachers/teachers.repository.js';
import { StudentsRepository } from '../students/students.repository.js';
import { TeacherAssignmentsRepository } from '../teacher-assignments/teacher-assignments.repository.js';
import type { Grade } from '../../db/schema/grades.js';
import type { Board } from '../../db/schema/boards.js';
import type { Teacher } from '../../db/schema/teachers.js';
import {
  ConflictError,
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} from '../../lib/app-error.js';

describe('GradesService', () => {
  let service: GradesService;
  let mockGradesRepo: GradesRepository;
  let mockBoardsRepo: BoardsRepository;
  let mockTeachersRepo: TeachersRepository;
  let mockStudentsRepo: StudentsRepository;
  let mockTeacherAssignmentsRepo: TeacherAssignmentsRepository;

  const mockBoard: Board = {
    id: '22222222-2222-4222-a222-222222222222',
    schoolId: '11111111-1111-4111-a111-111111111111',
    name: 'Central Board of Secondary Education',
    code: 'CBSE',
    description: 'National education board',
    status: 'active',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    deletedAt: null,
  };

  const mockTeacher: Teacher = {
    id: '88888888-8888-4888-a888-888888888888',
    schoolId: mockBoard.schoolId,
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
    id: '33333333-3333-4333-a333-333333333333',
    schoolId: mockBoard.schoolId,
    boardId: mockBoard.id,
    name: 'Grade 10 - Section A',
    code: 'G10-A',
    gradeNumber: 10,
    section: 'A',
    capacity: 40,
    classTeacherId: null,
    status: 'active',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    deletedAt: null,
  };

  beforeEach(() => {
    mockGradesRepo = new GradesRepository();
    mockBoardsRepo = new BoardsRepository();
    mockTeachersRepo = new TeachersRepository();
    mockStudentsRepo = new StudentsRepository();
    mockTeacherAssignmentsRepo = new TeacherAssignmentsRepository();
    service = new GradesService(
      mockGradesRepo,
      mockBoardsRepo,
      mockTeachersRepo,
      mockStudentsRepo,
      mockTeacherAssignmentsRepo,
    );
    vi.spyOn(mockStudentsRepo, 'hasActiveStudentsByGrade').mockResolvedValue(false);
    vi.spyOn(mockTeacherAssignmentsRepo, 'hasActiveAssignmentsByGrade').mockResolvedValue(false);
  });

  describe('createGrade', () => {
    it('creates grade with normalized code and section', async () => {
      vi.spyOn(mockBoardsRepo, 'findById').mockResolvedValue(mockBoard);
      const findDuplicateSpy = vi
        .spyOn(mockGradesRepo, 'findByBoardGradeAndSection')
        .mockResolvedValue(null);
      const createSpy = vi.spyOn(mockGradesRepo, 'create').mockResolvedValue(mockGrade);

      const result = await service.createGrade(
        mockBoard.id,
        {
          name: 'Grade 10 - Section A',
          code: 'g10-a',
          gradeNumber: 10,
          section: 'a',
          capacity: 40,
          status: 'active',
        },
        mockBoard.schoolId,
        'admin',
      );

      expect(findDuplicateSpy).toHaveBeenCalledWith(mockBoard.id, 10, 'A');
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          schoolId: mockBoard.schoolId,
          boardId: mockBoard.id,
          name: 'Grade 10 - Section A',
          code: 'G10-A',
          gradeNumber: 10,
          section: 'A',
          capacity: 40,
        }),
      );
      expect(result).toEqual(mockGrade);
    });

    it('throws NotFoundError if board does not exist', async () => {
      vi.spyOn(mockBoardsRepo, 'findById').mockResolvedValue(null);

      await expect(
        service.createGrade(
          'non-existent-board',
          {
            name: 'Grade 10',
            code: 'G10',
            gradeNumber: 10,
            status: 'active',
          },
          mockBoard.schoolId,
          'admin',
        ),
      ).rejects.toThrow(NotFoundError);
    });

    it('throws ForbiddenError if board belongs to another school', async () => {
      vi.spyOn(mockBoardsRepo, 'findById').mockResolvedValue(mockBoard);

      await expect(
        service.createGrade(
          mockBoard.id,
          {
            name: 'Grade 10',
            code: 'G10',
            gradeNumber: 10,
            status: 'active',
          },
          'different-school-id',
          'admin',
        ),
      ).rejects.toThrow(ForbiddenError);
    });

    it('throws ConflictError if section already exists in board', async () => {
      vi.spyOn(mockBoardsRepo, 'findById').mockResolvedValue(mockBoard);
      vi.spyOn(mockGradesRepo, 'findByBoardGradeAndSection').mockResolvedValue(mockGrade);

      await expect(
        service.createGrade(
          mockBoard.id,
          {
            name: 'Grade 10 - Section A Duplicate',
            code: 'G10-A2',
            gradeNumber: 10,
            section: 'A',
            status: 'active',
          },
          mockBoard.schoolId,
          'admin',
        ),
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('getGradeById', () => {
    it('returns grade when found for super_admin', async () => {
      vi.spyOn(mockGradesRepo, 'findById').mockResolvedValue(mockGrade);

      const result = await service.getGradeById(mockGrade.id, null, 'super_admin');
      expect(result).toEqual(mockGrade);
    });

    it('returns grade when found for own school admin', async () => {
      vi.spyOn(mockGradesRepo, 'findById').mockResolvedValue(mockGrade);

      const result = await service.getGradeById(mockGrade.id, mockBoard.schoolId, 'admin');
      expect(result).toEqual(mockGrade);
    });

    it('throws ForbiddenError when accessed by user from another school', async () => {
      vi.spyOn(mockGradesRepo, 'findById').mockResolvedValue(mockGrade);

      await expect(service.getGradeById(mockGrade.id, 'other-school-id', 'admin')).rejects.toThrow(
        ForbiddenError,
      );
    });

    it('throws NotFoundError when grade not found', async () => {
      vi.spyOn(mockGradesRepo, 'findById').mockResolvedValue(null);

      await expect(
        service.getGradeById('non-existent-id', mockBoard.schoolId, 'admin'),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateGrade', () => {
    it('updates grade successfully for own school admin', async () => {
      vi.spyOn(mockGradesRepo, 'findById').mockResolvedValue(mockGrade);
      vi.spyOn(mockGradesRepo, 'update').mockResolvedValue({
        ...mockGrade,
        name: 'Updated Grade 10 - A',
      });

      const result = await service.updateGrade(
        mockGrade.id,
        { name: 'Updated Grade 10 - A' },
        mockBoard.schoolId,
        'admin',
      );

      expect(result.name).toBe('Updated Grade 10 - A');
    });

    it('throws ForbiddenError when updated by admin of another school', async () => {
      vi.spyOn(mockGradesRepo, 'findById').mockResolvedValue(mockGrade);

      await expect(
        service.updateGrade(mockGrade.id, { name: 'Hacked' }, 'different-school', 'admin'),
      ).rejects.toThrow(ForbiddenError);
    });

    it('throws ConflictError when new gradeNumber/section conflicts with existing grade in board', async () => {
      vi.spyOn(mockGradesRepo, 'findById').mockResolvedValue(mockGrade);
      vi.spyOn(mockGradesRepo, 'findByBoardGradeAndSection').mockResolvedValue({
        ...mockGrade,
        id: '44444444-4444-4444-a444-444444444444',
        section: 'B',
      });

      await expect(
        service.updateGrade(mockGrade.id, { section: 'B' }, mockBoard.schoolId, 'admin'),
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('deleteGrade', () => {
    it('soft-deletes grade successfully', async () => {
      vi.spyOn(mockGradesRepo, 'findById').mockResolvedValue(mockGrade);
      const deleteSpy = vi.spyOn(mockGradesRepo, 'softDelete').mockResolvedValue(true);

      await service.deleteGrade(mockGrade.id, mockBoard.schoolId, 'admin');
      expect(deleteSpy).toHaveBeenCalledWith(mockGrade.id);
    });

    it('throws ConflictError when deleting grade with active enrolled students', async () => {
      vi.spyOn(mockGradesRepo, 'findById').mockResolvedValue(mockGrade);
      vi.spyOn(mockStudentsRepo, 'hasActiveStudentsByGrade').mockResolvedValue(true);

      await expect(service.deleteGrade(mockGrade.id, mockBoard.schoolId, 'admin')).rejects.toThrow(
        ConflictError,
      );
    });

    it('throws ConflictError when deleting grade with active teacher assignments', async () => {
      vi.spyOn(mockGradesRepo, 'findById').mockResolvedValue(mockGrade);
      vi.spyOn(mockTeacherAssignmentsRepo, 'hasActiveAssignmentsByGrade').mockResolvedValue(true);

      await expect(service.deleteGrade(mockGrade.id, mockBoard.schoolId, 'admin')).rejects.toThrow(
        ConflictError,
      );
    });

    it('throws ForbiddenError when deleting grade from another school', async () => {
      vi.spyOn(mockGradesRepo, 'findById').mockResolvedValue(mockGrade);

      await expect(service.deleteGrade(mockGrade.id, 'other-school', 'admin')).rejects.toThrow(
        ForbiddenError,
      );
    });

    it('throws NotFoundError when grade to delete does not exist', async () => {
      vi.spyOn(mockGradesRepo, 'findById').mockResolvedValue(null);

      await expect(
        service.deleteGrade('unknown-grade', mockBoard.schoolId, 'admin'),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('listGradesByBoard', () => {
    it('returns paginated grades when board exists and caller has access', async () => {
      vi.spyOn(mockBoardsRepo, 'findById').mockResolvedValue(mockBoard);
      vi.spyOn(mockGradesRepo, 'listByBoard').mockResolvedValue([mockGrade]);

      const result = await service.listGradesByBoard(
        mockBoard.id,
        { limit: 10 },
        mockBoard.schoolId,
        'admin',
      );
      expect(result.data).toHaveLength(1);
      expect(result.data[0]?.id).toBe(mockGrade.id);
      expect(result.pageInfo.hasMore).toBe(false);
    });

    it('throws NotFoundError if board does not exist', async () => {
      vi.spyOn(mockBoardsRepo, 'findById').mockResolvedValue(null);

      await expect(
        service.listGradesByBoard('non-existent-board', { limit: 10 }, mockBoard.schoolId, 'admin'),
      ).rejects.toThrow(NotFoundError);
    });

    it('throws ForbiddenError if board belongs to another school', async () => {
      vi.spyOn(mockBoardsRepo, 'findById').mockResolvedValue(mockBoard);

      await expect(
        service.listGradesByBoard(mockBoard.id, { limit: 10 }, 'other-school', 'admin'),
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('assignClassTeacher', () => {
    it('assigns an active teacher from the same school successfully', async () => {
      vi.spyOn(mockGradesRepo, 'findById').mockResolvedValue(mockGrade);
      vi.spyOn(mockTeachersRepo, 'findById').mockResolvedValue(mockTeacher);
      const updatedGrade = { ...mockGrade, classTeacherId: mockTeacher.id };
      const setSpy = vi.spyOn(mockGradesRepo, 'setClassTeacher').mockResolvedValue(updatedGrade);

      const result = await service.assignClassTeacher(
        mockGrade.id,
        mockTeacher.id,
        mockBoard.schoolId,
        'admin',
      );

      expect(result.classTeacherId).toBe(mockTeacher.id);
      expect(setSpy).toHaveBeenCalledWith(mockGrade.id, mockTeacher.id);
    });

    it('unassigns class teacher when passing null', async () => {
      const gradeWithTeacher = { ...mockGrade, classTeacherId: mockTeacher.id };
      vi.spyOn(mockGradesRepo, 'findById').mockResolvedValue(gradeWithTeacher);
      const setSpy = vi.spyOn(mockGradesRepo, 'setClassTeacher').mockResolvedValue(mockGrade);

      const result = await service.assignClassTeacher(
        mockGrade.id,
        null,
        mockBoard.schoolId,
        'admin',
      );

      expect(result.classTeacherId).toBeNull();
      expect(setSpy).toHaveBeenCalledWith(mockGrade.id, null);
    });

    it('throws NotFoundError if grade does not exist', async () => {
      vi.spyOn(mockGradesRepo, 'findById').mockResolvedValue(null);

      await expect(
        service.assignClassTeacher('non-existent', mockTeacher.id, mockBoard.schoolId, 'admin'),
      ).rejects.toThrow(NotFoundError);
    });

    it('throws ForbiddenError if caller belongs to another school', async () => {
      vi.spyOn(mockGradesRepo, 'findById').mockResolvedValue(mockGrade);

      await expect(
        service.assignClassTeacher(mockGrade.id, mockTeacher.id, 'other-school', 'admin'),
      ).rejects.toThrow(ForbiddenError);
    });

    it('throws BadRequestError if grade is inactive', async () => {
      vi.spyOn(mockGradesRepo, 'findById').mockResolvedValue({
        ...mockGrade,
        status: 'inactive',
      });

      await expect(
        service.assignClassTeacher(mockGrade.id, mockTeacher.id, mockBoard.schoolId, 'admin'),
      ).rejects.toThrow(BadRequestError);
    });

    it('throws NotFoundError if teacher does not exist', async () => {
      vi.spyOn(mockGradesRepo, 'findById').mockResolvedValue(mockGrade);
      vi.spyOn(mockTeachersRepo, 'findById').mockResolvedValue(null);

      await expect(
        service.assignClassTeacher(
          mockGrade.id,
          'non-existent-teacher',
          mockBoard.schoolId,
          'admin',
        ),
      ).rejects.toThrow(NotFoundError);
    });

    it('throws BadRequestError if teacher belongs to a different school', async () => {
      vi.spyOn(mockGradesRepo, 'findById').mockResolvedValue(mockGrade);
      vi.spyOn(mockTeachersRepo, 'findById').mockResolvedValue({
        ...mockTeacher,
        schoolId: 'different-school',
      });

      await expect(
        service.assignClassTeacher(mockGrade.id, mockTeacher.id, mockBoard.schoolId, 'admin'),
      ).rejects.toThrow(BadRequestError);
    });

    it('throws BadRequestError if teacher is inactive', async () => {
      vi.spyOn(mockGradesRepo, 'findById').mockResolvedValue(mockGrade);
      vi.spyOn(mockTeachersRepo, 'findById').mockResolvedValue({
        ...mockTeacher,
        status: 'inactive',
      });

      await expect(
        service.assignClassTeacher(mockGrade.id, mockTeacher.id, mockBoard.schoolId, 'admin'),
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe('getClassTeacher', () => {
    it('returns null if grade has no assigned class teacher', async () => {
      vi.spyOn(mockGradesRepo, 'findById').mockResolvedValue(mockGrade);

      const result = await service.getClassTeacher(mockGrade.id, mockBoard.schoolId, 'admin');
      expect(result).toBeNull();
    });

    it('returns teacher if grade has an assigned class teacher', async () => {
      const gradeWithTeacher = { ...mockGrade, classTeacherId: mockTeacher.id };
      vi.spyOn(mockGradesRepo, 'findById').mockResolvedValue(gradeWithTeacher);
      vi.spyOn(mockTeachersRepo, 'findById').mockResolvedValue(mockTeacher);

      const result = await service.getClassTeacher(mockGrade.id, mockBoard.schoolId, 'admin');
      expect(result).toEqual(mockTeacher);
    });

    it('throws NotFoundError if grade does not exist', async () => {
      vi.spyOn(mockGradesRepo, 'findById').mockResolvedValue(null);

      await expect(
        service.getClassTeacher('non-existent', mockBoard.schoolId, 'admin'),
      ).rejects.toThrow(NotFoundError);
    });

    it('throws ForbiddenError if caller belongs to another school', async () => {
      vi.spyOn(mockGradesRepo, 'findById').mockResolvedValue(mockGrade);

      await expect(service.getClassTeacher(mockGrade.id, 'other-school', 'admin')).rejects.toThrow(
        ForbiddenError,
      );
    });
  });
});
