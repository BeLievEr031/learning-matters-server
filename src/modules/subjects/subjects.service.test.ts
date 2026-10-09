import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SubjectsService } from './subjects.service.js';
import { SubjectsRepository, type GradeSubjectItem } from './subjects.repository.js';
import { GradesRepository } from '../grades/grades.repository.js';
import type { Subject, GradeSubject } from '../../db/schema/subjects.js';
import type { Grade } from '../../db/schema/grades.js';
import {
  ConflictError,
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} from '../../lib/app-error.js';

describe('SubjectsService', () => {
  let service: SubjectsService;
  let mockSubjectsRepo: SubjectsRepository;
  let mockGradesRepo: GradesRepository;

  const school1Id = '11111111-1111-4111-a111-111111111111';
  const school2Id = '22222222-2222-4222-a222-222222222222';

  const mockGrade: Grade = {
    id: '33333333-3333-4333-a333-333333333333',
    schoolId: school1Id,
    boardId: '44444444-4444-4444-a444-444444444444',
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

  const mockSubject: Subject = {
    id: '55555555-5555-4555-a555-555555555555',
    schoolId: school1Id,
    name: 'Mathematics',
    code: 'MATH',
    description: 'Core Mathematics syllabus',
    status: 'active',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    deletedAt: null,
  };

  const mockGradeSubject: GradeSubject = {
    id: '66666666-6666-4666-a666-666666666666',
    schoolId: school1Id,
    gradeId: mockGrade.id,
    subjectId: mockSubject.id,
    status: 'active',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  };

  const mockGradeSubjectItem: GradeSubjectItem = {
    ...mockSubject,
    gradeSubjectId: mockGradeSubject.id,
    gradeSubjectStatus: mockGradeSubject.status,
  };

  beforeEach(() => {
    mockSubjectsRepo = new SubjectsRepository();
    mockGradesRepo = new GradesRepository();
    service = new SubjectsService(mockSubjectsRepo, mockGradesRepo);
  });

  describe('assignOrCreateSubject', () => {
    it('creates a new subject catalog entry and assigns it when subjectId is omitted', async () => {
      vi.spyOn(mockGradesRepo, 'findById').mockResolvedValue(mockGrade);
      vi.spyOn(mockSubjectsRepo, 'findBySchoolAndCode').mockResolvedValue(null);
      const createSpy = vi.spyOn(mockSubjectsRepo, 'create').mockResolvedValue(mockSubject);
      vi.spyOn(mockSubjectsRepo, 'findGradeSubject').mockResolvedValue(null);
      const assignSpy = vi
        .spyOn(mockSubjectsRepo, 'assignToGrade')
        .mockResolvedValue(mockGradeSubject);

      const result = await service.assignOrCreateSubject(
        mockGrade.id,
        {
          name: 'Mathematics',
          code: 'math',
          description: 'Core Mathematics syllabus',
          status: 'active',
        },
        school1Id,
        'admin',
      );

      expect(createSpy).toHaveBeenCalledWith({
        schoolId: school1Id,
        name: 'Mathematics',
        code: 'MATH',
        description: 'Core Mathematics syllabus',
        status: 'active',
      });
      expect(assignSpy).toHaveBeenCalledWith(school1Id, mockGrade.id, mockSubject.id, 'active');
      expect(result).toEqual(mockGradeSubjectItem);
    });

    it('reuses existing catalog subject when code matches in the same school', async () => {
      vi.spyOn(mockGradesRepo, 'findById').mockResolvedValue(mockGrade);
      vi.spyOn(mockSubjectsRepo, 'findBySchoolAndCode').mockResolvedValue(mockSubject);
      const createSpy = vi.spyOn(mockSubjectsRepo, 'create');
      vi.spyOn(mockSubjectsRepo, 'findGradeSubject').mockResolvedValue(null);
      vi.spyOn(mockSubjectsRepo, 'assignToGrade').mockResolvedValue(mockGradeSubject);

      const result = await service.assignOrCreateSubject(
        mockGrade.id,
        {
          name: 'Mathematics New',
          code: 'MATH',
        },
        school1Id,
        'admin',
      );

      expect(createSpy).not.toHaveBeenCalled();
      expect(result.id).toBe(mockSubject.id);
      expect(result.gradeSubjectId).toBe(mockGradeSubject.id);
    });

    it('assigns existing subject when subjectId is provided', async () => {
      vi.spyOn(mockGradesRepo, 'findById').mockResolvedValue(mockGrade);
      vi.spyOn(mockSubjectsRepo, 'findById').mockResolvedValue(mockSubject);
      vi.spyOn(mockSubjectsRepo, 'findGradeSubject').mockResolvedValue(null);
      vi.spyOn(mockSubjectsRepo, 'assignToGrade').mockResolvedValue(mockGradeSubject);

      const result = await service.assignOrCreateSubject(
        mockGrade.id,
        { subjectId: mockSubject.id },
        school1Id,
        'admin',
      );

      expect(result.id).toBe(mockSubject.id);
      expect(result.gradeSubjectId).toBe(mockGradeSubject.id);
    });

    it('throws BadRequestError if neither subjectId nor (name and code) are provided', async () => {
      vi.spyOn(mockGradesRepo, 'findById').mockResolvedValue(mockGrade);

      await expect(
        service.assignOrCreateSubject(
          mockGrade.id,
          { description: 'Incomplete' },
          school1Id,
          'admin',
        ),
      ).rejects.toThrow(BadRequestError);
    });

    it('throws ConflictError if subject is already assigned to the grade', async () => {
      vi.spyOn(mockGradesRepo, 'findById').mockResolvedValue(mockGrade);
      vi.spyOn(mockSubjectsRepo, 'findById').mockResolvedValue(mockSubject);
      vi.spyOn(mockSubjectsRepo, 'findGradeSubject').mockResolvedValue(mockGradeSubject);

      await expect(
        service.assignOrCreateSubject(
          mockGrade.id,
          { subjectId: mockSubject.id },
          school1Id,
          'admin',
        ),
      ).rejects.toThrow(ConflictError);
    });

    it('throws ForbiddenError if subject belongs to a different school', async () => {
      vi.spyOn(mockGradesRepo, 'findById').mockResolvedValue(mockGrade);
      vi.spyOn(mockSubjectsRepo, 'findById').mockResolvedValue({
        ...mockSubject,
        schoolId: school2Id,
      });

      await expect(
        service.assignOrCreateSubject(
          mockGrade.id,
          { subjectId: mockSubject.id },
          school1Id,
          'super_admin',
        ),
      ).rejects.toThrow(ForbiddenError);
    });

    it('throws NotFoundError if grade does not exist', async () => {
      vi.spyOn(mockGradesRepo, 'findById').mockResolvedValue(null);

      await expect(
        service.assignOrCreateSubject(
          'non-existent-grade',
          { subjectId: mockSubject.id },
          school1Id,
          'admin',
        ),
      ).rejects.toThrow(NotFoundError);
    });

    it('throws ForbiddenError if accessing grade of another school', async () => {
      vi.spyOn(mockGradesRepo, 'findById').mockResolvedValue({
        ...mockGrade,
        schoolId: school2Id,
      });

      await expect(
        service.assignOrCreateSubject(
          mockGrade.id,
          { subjectId: mockSubject.id },
          school1Id,
          'admin',
        ),
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('listSubjectsByGrade', () => {
    it('returns paginated subjects assigned to the grade', async () => {
      vi.spyOn(mockGradesRepo, 'findById').mockResolvedValue(mockGrade);
      vi.spyOn(mockSubjectsRepo, 'listSubjectsByGrade').mockResolvedValue([mockGradeSubjectItem]);

      const result = await service.listSubjectsByGrade(
        mockGrade.id,
        { limit: 20 },
        school1Id,
        'admin',
      );

      expect(result.data).toHaveLength(1);
      expect(result.data[0]?.code).toBe('MATH');
    });

    it('throws NotFoundError if grade does not exist', async () => {
      vi.spyOn(mockGradesRepo, 'findById').mockResolvedValue(null);

      await expect(
        service.listSubjectsByGrade('missing-grade', {}, school1Id, 'admin'),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('getSubjectById', () => {
    it('returns subject when accessible', async () => {
      vi.spyOn(mockSubjectsRepo, 'findById').mockResolvedValue(mockSubject);

      const result = await service.getSubjectById(mockSubject.id, school1Id, 'admin');
      expect(result).toEqual(mockSubject);
    });

    it('throws NotFoundError if subject is not found', async () => {
      vi.spyOn(mockSubjectsRepo, 'findById').mockResolvedValue(null);

      await expect(service.getSubjectById('missing', school1Id, 'admin')).rejects.toThrow(
        NotFoundError,
      );
    });

    it('throws ForbiddenError for cross-school access', async () => {
      vi.spyOn(mockSubjectsRepo, 'findById').mockResolvedValue({
        ...mockSubject,
        schoolId: school2Id,
      });

      await expect(service.getSubjectById(mockSubject.id, school1Id, 'admin')).rejects.toThrow(
        ForbiddenError,
      );
    });
  });

  describe('updateSubject', () => {
    it('updates subject successfully', async () => {
      vi.spyOn(mockSubjectsRepo, 'findById').mockResolvedValue(mockSubject);
      vi.spyOn(mockSubjectsRepo, 'findBySchoolAndCode').mockResolvedValue(null);
      const updatedSubject = { ...mockSubject, name: 'Advanced Math' };
      vi.spyOn(mockSubjectsRepo, 'update').mockResolvedValue(updatedSubject);

      const result = await service.updateSubject(
        mockSubject.id,
        { name: 'Advanced Math' },
        school1Id,
        'admin',
      );

      expect(result).toEqual(updatedSubject);
    });

    it('throws ConflictError if updated code collides with another subject in the school', async () => {
      vi.spyOn(mockSubjectsRepo, 'findById').mockResolvedValue(mockSubject);
      vi.spyOn(mockSubjectsRepo, 'findBySchoolAndCode').mockResolvedValue({
        ...mockSubject,
        id: 'different-subject-id',
        code: 'SCI',
      });

      await expect(
        service.updateSubject(mockSubject.id, { code: 'sci' }, school1Id, 'admin'),
      ).rejects.toThrow(ConflictError);
    });

    it('allows keeping the same code on update', async () => {
      vi.spyOn(mockSubjectsRepo, 'findById').mockResolvedValue(mockSubject);
      vi.spyOn(mockSubjectsRepo, 'findBySchoolAndCode').mockResolvedValue(mockSubject);
      vi.spyOn(mockSubjectsRepo, 'update').mockResolvedValue(mockSubject);

      const result = await service.updateSubject(
        mockSubject.id,
        { code: 'MATH', description: 'Updated' },
        school1Id,
        'admin',
      );

      expect(result).toEqual(mockSubject);
    });
  });

  describe('removeGradeAssignment', () => {
    it('removes subject assignment from grade', async () => {
      vi.spyOn(mockGradesRepo, 'findById').mockResolvedValue(mockGrade);
      vi.spyOn(mockSubjectsRepo, 'findById').mockResolvedValue(mockSubject);
      vi.spyOn(mockSubjectsRepo, 'findGradeSubject').mockResolvedValue(mockGradeSubject);
      const deleteSpy = vi.spyOn(mockSubjectsRepo, 'removeGradeAssignment').mockResolvedValue(true);

      await service.removeGradeAssignment(mockGrade.id, mockSubject.id, school1Id, 'admin');

      expect(deleteSpy).toHaveBeenCalledWith(mockGrade.id, mockSubject.id);
    });

    it('throws NotFoundError if assignment does not exist', async () => {
      vi.spyOn(mockGradesRepo, 'findById').mockResolvedValue(mockGrade);
      vi.spyOn(mockSubjectsRepo, 'findById').mockResolvedValue(mockSubject);
      vi.spyOn(mockSubjectsRepo, 'findGradeSubject').mockResolvedValue(null);

      await expect(
        service.removeGradeAssignment(mockGrade.id, mockSubject.id, school1Id, 'admin'),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('deleteSubject', () => {
    it('soft deletes subject and cascade removes grade assignments', async () => {
      vi.spyOn(mockSubjectsRepo, 'findById').mockResolvedValue(mockSubject);
      const deleteSpy = vi.spyOn(mockSubjectsRepo, 'softDelete').mockResolvedValue(true);
      const cascadeSpy = vi
        .spyOn(mockSubjectsRepo, 'cascadeRemoveGradeAssignments')
        .mockResolvedValue(1);

      await service.deleteSubject(mockSubject.id, school1Id, 'admin');

      expect(deleteSpy).toHaveBeenCalledWith(mockSubject.id);
      expect(cascadeSpy).toHaveBeenCalledWith(mockSubject.id);
    });

    it('throws NotFoundError if subject to delete does not exist', async () => {
      vi.spyOn(mockSubjectsRepo, 'findById').mockResolvedValue(null);

      await expect(service.deleteSubject('missing', school1Id, 'admin')).rejects.toThrow(
        NotFoundError,
      );
    });
  });
});
