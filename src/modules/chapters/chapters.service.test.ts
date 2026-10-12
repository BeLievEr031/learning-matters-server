import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChaptersService } from './chapters.service.js';
import { ChaptersRepository } from './chapters.repository.js';
import { SubjectsRepository } from '../subjects/subjects.repository.js';
import type { Chapter } from '../../db/schema/chapters.js';
import type { Subject } from '../../db/schema/subjects.js';
import {
  ConflictError,
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} from '../../lib/app-error.js';

describe('ChaptersService', () => {
  let service: ChaptersService;
  let mockChaptersRepo: ChaptersRepository;
  let mockSubjectsRepo: SubjectsRepository;

  const school1Id = '11111111-1111-4111-a111-111111111111';
  const school2Id = '22222222-2222-4222-a222-222222222222';

  const mockSubject: Subject = {
    id: '33333333-3333-4333-a333-333333333333',
    schoolId: school1Id,
    name: 'Mathematics',
    code: 'MATH',
    description: 'Core Mathematics syllabus',
    status: 'active',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    deletedAt: null,
  };

  const mockChapter: Chapter = {
    id: '44444444-4444-4444-a444-444444444444',
    schoolId: school1Id,
    subjectId: mockSubject.id,
    chapterNumber: 1,
    title: 'Algebra Foundations',
    description: 'Introduction to expressions and equations',
    status: 'active',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    deletedAt: null,
  };

  beforeEach(() => {
    mockChaptersRepo = new ChaptersRepository();
    mockSubjectsRepo = new SubjectsRepository();
    service = new ChaptersService(mockChaptersRepo, mockSubjectsRepo);
  });

  describe('createChapter', () => {
    it('creates a new chapter successfully', async () => {
      vi.spyOn(mockSubjectsRepo, 'findById').mockResolvedValue(mockSubject);
      vi.spyOn(mockChaptersRepo, 'findBySubjectAndNumber').mockResolvedValue(null);
      const createSpy = vi.spyOn(mockChaptersRepo, 'create').mockResolvedValue(mockChapter);

      const result = await service.createChapter(
        mockSubject.id,
        {
          chapterNumber: 1,
          title: 'Algebra Foundations',
          description: 'Introduction to expressions and equations',
          status: 'active',
        },
        school1Id,
        'admin',
      );

      expect(result).toEqual(mockChapter);
      expect(createSpy).toHaveBeenCalledWith({
        schoolId: school1Id,
        subjectId: mockSubject.id,
        chapterNumber: 1,
        title: 'Algebra Foundations',
        description: 'Introduction to expressions and equations',
        status: 'active',
      });
    });

    it('throws NotFoundError if subject does not exist', async () => {
      vi.spyOn(mockSubjectsRepo, 'findById').mockResolvedValue(null);

      await expect(
        service.createChapter(
          mockSubject.id,
          { chapterNumber: 1, title: 'Chapter 1', status: 'active' },
          school1Id,
          'admin',
        ),
      ).rejects.toThrow(NotFoundError);
    });

    it('throws ForbiddenError if school admin accesses subject from another school', async () => {
      vi.spyOn(mockSubjectsRepo, 'findById').mockResolvedValue(mockSubject);

      await expect(
        service.createChapter(
          mockSubject.id,
          { chapterNumber: 1, title: 'Chapter 1', status: 'active' },
          school2Id,
          'admin',
        ),
      ).rejects.toThrow(ForbiddenError);
    });

    it('allows super_admin to create chapter regardless of schoolId', async () => {
      vi.spyOn(mockSubjectsRepo, 'findById').mockResolvedValue(mockSubject);
      vi.spyOn(mockChaptersRepo, 'findBySubjectAndNumber').mockResolvedValue(null);
      vi.spyOn(mockChaptersRepo, 'create').mockResolvedValue(mockChapter);

      const result = await service.createChapter(
        mockSubject.id,
        { chapterNumber: 1, title: 'Algebra Foundations', status: 'active' },
        null,
        'super_admin',
      );

      expect(result).toEqual(mockChapter);
    });

    it('throws BadRequestError if subject is inactive or archived', async () => {
      vi.spyOn(mockSubjectsRepo, 'findById').mockResolvedValue({
        ...mockSubject,
        status: 'inactive',
      });

      await expect(
        service.createChapter(
          mockSubject.id,
          { chapterNumber: 1, title: 'Chapter 1', status: 'active' },
          school1Id,
          'admin',
        ),
      ).rejects.toThrow(BadRequestError);
    });

    it('throws ConflictError if chapterNumber already exists in the subject', async () => {
      vi.spyOn(mockSubjectsRepo, 'findById').mockResolvedValue(mockSubject);
      vi.spyOn(mockChaptersRepo, 'findBySubjectAndNumber').mockResolvedValue(mockChapter);

      await expect(
        service.createChapter(
          mockSubject.id,
          { chapterNumber: 1, title: 'Chapter 1', status: 'active' },
          school1Id,
          'admin',
        ),
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('listChaptersBySubject', () => {
    it('returns paginated chapters for a subject', async () => {
      vi.spyOn(mockSubjectsRepo, 'findById').mockResolvedValue(mockSubject);
      vi.spyOn(mockChaptersRepo, 'listBySubject').mockResolvedValue([mockChapter]);

      const result = await service.listChaptersBySubject(
        mockSubject.id,
        { limit: 10 },
        school1Id,
        'teacher',
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual([mockChapter]);
      expect(result.pageInfo.hasMore).toBe(false);
    });

    it('throws NotFoundError if subject does not exist', async () => {
      vi.spyOn(mockSubjectsRepo, 'findById').mockResolvedValue(null);

      await expect(
        service.listChaptersBySubject(mockSubject.id, {}, school1Id, 'admin'),
      ).rejects.toThrow(NotFoundError);
    });

    it('throws ForbiddenError if caller school differs from subject school', async () => {
      vi.spyOn(mockSubjectsRepo, 'findById').mockResolvedValue(mockSubject);

      await expect(
        service.listChaptersBySubject(mockSubject.id, {}, school2Id, 'admin'),
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('getChapterById', () => {
    it('returns chapter when accessible', async () => {
      vi.spyOn(mockChaptersRepo, 'findById').mockResolvedValue(mockChapter);

      const result = await service.getChapterById(mockChapter.id, school1Id, 'student');
      expect(result).toEqual(mockChapter);
    });

    it('throws NotFoundError if chapter is not found', async () => {
      vi.spyOn(mockChaptersRepo, 'findById').mockResolvedValue(null);

      await expect(
        service.getChapterById('00000000-0000-0000-0000-000000000000', school1Id, 'admin'),
      ).rejects.toThrow(NotFoundError);
    });

    it('throws ForbiddenError for cross-school chapter access', async () => {
      vi.spyOn(mockChaptersRepo, 'findById').mockResolvedValue(mockChapter);

      await expect(service.getChapterById(mockChapter.id, school2Id, 'admin')).rejects.toThrow(
        ForbiddenError,
      );
    });
  });

  describe('updateChapter', () => {
    it('updates chapter details successfully', async () => {
      vi.spyOn(mockChaptersRepo, 'findById').mockResolvedValue(mockChapter);
      vi.spyOn(mockChaptersRepo, 'update').mockResolvedValue({
        ...mockChapter,
        title: 'Advanced Algebra',
      });

      const result = await service.updateChapter(
        mockChapter.id,
        { title: 'Advanced Algebra' },
        school1Id,
        'admin',
      );

      expect(result.title).toBe('Advanced Algebra');
    });

    it('throws ConflictError if new chapterNumber collides with another chapter in the subject', async () => {
      vi.spyOn(mockChaptersRepo, 'findById').mockResolvedValue(mockChapter);
      vi.spyOn(mockChaptersRepo, 'findBySubjectAndNumber').mockResolvedValue({
        ...mockChapter,
        id: '55555555-5555-5555-a555-555555555555',
        chapterNumber: 2,
      });

      await expect(
        service.updateChapter(mockChapter.id, { chapterNumber: 2 }, school1Id, 'admin'),
      ).rejects.toThrow(ConflictError);
    });

    it('allows keeping the same chapterNumber on update', async () => {
      vi.spyOn(mockChaptersRepo, 'findById').mockResolvedValue(mockChapter);
      vi.spyOn(mockChaptersRepo, 'update').mockResolvedValue(mockChapter);

      const result = await service.updateChapter(
        mockChapter.id,
        { chapterNumber: 1, title: 'Same Chapter' },
        school1Id,
        'admin',
      );

      expect(result).toEqual(mockChapter);
    });
  });

  describe('deleteChapter', () => {
    it('soft deletes chapter successfully', async () => {
      vi.spyOn(mockChaptersRepo, 'findById').mockResolvedValue(mockChapter);
      vi.spyOn(mockChaptersRepo, 'softDelete').mockResolvedValue(true);

      await expect(
        service.deleteChapter(mockChapter.id, school1Id, 'admin'),
      ).resolves.toBeUndefined();
    });

    it('throws NotFoundError if chapter does not exist', async () => {
      vi.spyOn(mockChaptersRepo, 'findById').mockResolvedValue(null);

      await expect(service.deleteChapter(mockChapter.id, school1Id, 'admin')).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe('reorderChapters', () => {
    it('reorders chapters successfully inside subject', async () => {
      const chapter2: Chapter = {
        ...mockChapter,
        id: '55555555-5555-5555-a555-555555555555',
        chapterNumber: 2,
        title: 'Geometry',
      };

      vi.spyOn(mockSubjectsRepo, 'findById').mockResolvedValue(mockSubject);
      vi.spyOn(mockChaptersRepo, 'findById')
        .mockResolvedValueOnce(mockChapter)
        .mockResolvedValueOnce(chapter2);
      vi.spyOn(mockChaptersRepo, 'reorder').mockResolvedValue([
        { ...chapter2, chapterNumber: 1 },
        { ...mockChapter, chapterNumber: 2 },
      ]);

      const result = await service.reorderChapters(
        mockSubject.id,
        {
          chapters: [
            { id: chapter2.id, chapterNumber: 1 },
            { id: mockChapter.id, chapterNumber: 2 },
          ],
        },
        school1Id,
        'admin',
      );

      expect(result[0]?.id).toBe(chapter2.id);
      expect(result[0]?.chapterNumber).toBe(1);
    });

    it('throws NotFoundError if a chapter does not belong to the subject', async () => {
      vi.spyOn(mockSubjectsRepo, 'findById').mockResolvedValue(mockSubject);
      vi.spyOn(mockChaptersRepo, 'findById').mockResolvedValue({
        ...mockChapter,
        subjectId: '99999999-9999-9999-a999-999999999999',
      });

      await expect(
        service.reorderChapters(
          mockSubject.id,
          { chapters: [{ id: mockChapter.id, chapterNumber: 1 }] },
          school1Id,
          'admin',
        ),
      ).rejects.toThrow(NotFoundError);
    });
  });
});
