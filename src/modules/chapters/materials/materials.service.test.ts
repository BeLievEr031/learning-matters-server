import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MaterialsService } from './materials.service.js';
import { MaterialsRepository } from './materials.repository.js';
import { ChaptersRepository } from '../chapters.repository.js';
import { TeachersRepository } from '../../teachers/teachers.repository.js';
import type { ChapterMaterial } from '../../../db/schema/chapter-materials.js';
import type { Chapter } from '../../../db/schema/chapters.js';
import type { Teacher } from '../../../db/schema/teachers.js';
import { NotFoundError, ForbiddenError, BadRequestError } from '../../../lib/app-error.js';

describe('MaterialsService', () => {
  let service: MaterialsService;
  let mockMaterialsRepo: MaterialsRepository;
  let mockChaptersRepo: ChaptersRepository;
  let mockTeachersRepo: TeachersRepository;

  const schoolId = '11111111-1111-4111-a111-111111111111';
  const otherSchoolId = '22222222-2222-4222-a222-222222222222';
  const chapterId = '33333333-3333-4333-a333-333333333333';
  const subjectId = '44444444-4444-4444-a444-444444444444';
  const teacherId = '55555555-5555-4555-a555-555555555555';
  const userId = '66666666-6666-4666-a666-666666666666';

  const mockChapter: Chapter = {
    id: chapterId,
    schoolId,
    subjectId,
    chapterNumber: 1,
    title: 'Algebra Basics',
    description: 'Intro to algebra',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockTeacher: Teacher = {
    id: teacherId,
    schoolId,
    userId,
    employeeId: 'EMP-001',
    firstName: 'Edna',
    lastName: 'Krabappel',
    email: 'edna@springfield.edu',
    phone: null,
    joiningDate: null,
    qualification: null,
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockMaterial: ChapterMaterial = {
    id: 'mat-1',
    schoolId,
    chapterId,
    subjectId,
    teacherId,
    title: 'Lecture Slides',
    description: 'PDF slides for chapter 1',
    materialType: 'document',
    fileUrl: '/uploads/slides.pdf',
    fileName: 'slides.pdf',
    fileSize: 1024,
    mimeType: 'application/pdf',
    externalUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(() => {
    mockMaterialsRepo = new MaterialsRepository();
    mockChaptersRepo = new ChaptersRepository();
    mockTeachersRepo = new TeachersRepository();
    service = new MaterialsService(mockMaterialsRepo, mockChaptersRepo, mockTeachersRepo);
  });

  describe('createMaterial', () => {
    it('creates material with file upload successfully for assigned teacher', async () => {
      vi.spyOn(mockChaptersRepo, 'findById').mockResolvedValue(mockChapter);
      vi.spyOn(mockTeachersRepo, 'findByUserId').mockResolvedValue(mockTeacher);
      vi.spyOn(mockTeachersRepo, 'hasTeacherSubjectAssignment').mockResolvedValue(true);
      const createSpy = vi.spyOn(mockMaterialsRepo, 'create').mockResolvedValue(mockMaterial);

      const mockFile = {
        filename: 'slides-123.pdf',
        originalname: 'slides.pdf',
        size: 1024,
        mimetype: 'application/pdf',
      } as Express.Multer.File;

      const result = await service.createMaterial(
        chapterId,
        {
          title: 'Lecture Slides',
          description: 'PDF slides for chapter 1',
          materialType: 'document',
        },
        mockFile,
        userId,
        schoolId,
        'teacher',
      );

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          chapterId,
          subjectId,
          teacherId,
          fileUrl: '/uploads/slides-123.pdf',
          materialType: 'document',
        }),
      );
      expect(result).toEqual(mockMaterial);
    });

    it('creates external URL material without file for video_link', async () => {
      vi.spyOn(mockChaptersRepo, 'findById').mockResolvedValue(mockChapter);
      vi.spyOn(mockTeachersRepo, 'findByUserId').mockResolvedValue(mockTeacher);
      vi.spyOn(mockTeachersRepo, 'hasTeacherSubjectAssignment').mockResolvedValue(true);
      const videoMaterial: ChapterMaterial = {
        ...mockMaterial,
        materialType: 'video_link',
        fileUrl: null,
        externalUrl: 'https://youtube.com/watch?v=123',
      };
      vi.spyOn(mockMaterialsRepo, 'create').mockResolvedValue(videoMaterial);

      const result = await service.createMaterial(
        chapterId,
        {
          title: 'YouTube Lecture',
          materialType: 'video_link',
          externalUrl: 'https://youtube.com/watch?v=123',
        },
        undefined,
        userId,
        schoolId,
        'teacher',
      );

      expect(result.materialType).toBe('video_link');
    });

    it('throws ForbiddenError if teacher does not teach this subject', async () => {
      vi.spyOn(mockChaptersRepo, 'findById').mockResolvedValue(mockChapter);
      vi.spyOn(mockTeachersRepo, 'findByUserId').mockResolvedValue(mockTeacher);
      vi.spyOn(mockTeachersRepo, 'hasTeacherSubjectAssignment').mockResolvedValue(false);

      await expect(
        service.createMaterial(
          chapterId,
          {
            title: 'Unassigned Subject Notes',
            materialType: 'reference_link',
            externalUrl: 'https://wikipedia.org',
          },
          undefined,
          userId,
          schoolId,
          'teacher',
        ),
      ).rejects.toThrow(ForbiddenError);
    });

    it('throws NotFoundError if chapter does not exist', async () => {
      vi.spyOn(mockChaptersRepo, 'findById').mockResolvedValue(null);

      await expect(
        service.createMaterial(
          'missing-chapter',
          { title: 'Material', materialType: 'reference_link', externalUrl: 'https://example.com' },
          undefined,
          userId,
          schoolId,
          'teacher',
        ),
      ).rejects.toThrow(NotFoundError);
    });

    it('throws ForbiddenError if chapter belongs to another school', async () => {
      vi.spyOn(mockChaptersRepo, 'findById').mockResolvedValue({
        ...mockChapter,
        schoolId: otherSchoolId,
      });

      await expect(
        service.createMaterial(
          chapterId,
          { title: 'Material', materialType: 'reference_link', externalUrl: 'https://example.com' },
          undefined,
          userId,
          schoolId,
          'teacher',
        ),
      ).rejects.toThrow(ForbiddenError);
    });

    it('throws BadRequestError if document material has no file or fileUrl', async () => {
      vi.spyOn(mockChaptersRepo, 'findById').mockResolvedValue(mockChapter);
      vi.spyOn(mockTeachersRepo, 'findByUserId').mockResolvedValue(mockTeacher);
      vi.spyOn(mockTeachersRepo, 'hasTeacherSubjectAssignment').mockResolvedValue(true);

      await expect(
        service.createMaterial(
          chapterId,
          { title: 'Empty Doc', materialType: 'document' },
          undefined,
          userId,
          schoolId,
          'teacher',
        ),
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe('listMaterialsByChapter', () => {
    it('returns materials list for chapter', async () => {
      vi.spyOn(mockChaptersRepo, 'findById').mockResolvedValue(mockChapter);
      vi.spyOn(mockMaterialsRepo, 'listByChapter').mockResolvedValue([mockMaterial]);

      const result = await service.listMaterialsByChapter(chapterId, {}, schoolId, 'student');

      expect(result).toEqual([mockMaterial]);
    });
  });

  describe('getMaterialById', () => {
    it('returns material by ID', async () => {
      vi.spyOn(mockChaptersRepo, 'findById').mockResolvedValue(mockChapter);
      vi.spyOn(mockMaterialsRepo, 'findById').mockResolvedValue(mockMaterial);

      const result = await service.getMaterialById(chapterId, mockMaterial.id, schoolId, 'student');

      expect(result).toEqual(mockMaterial);
    });

    it('throws NotFoundError if material does not belong to chapter', async () => {
      vi.spyOn(mockChaptersRepo, 'findById').mockResolvedValue(mockChapter);
      vi.spyOn(mockMaterialsRepo, 'findById').mockResolvedValue({
        ...mockMaterial,
        chapterId: 'other-chapter',
      });

      await expect(
        service.getMaterialById(chapterId, mockMaterial.id, schoolId, 'student'),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('deleteMaterial', () => {
    it('allows author teacher to delete material', async () => {
      vi.spyOn(mockChaptersRepo, 'findById').mockResolvedValue(mockChapter);
      vi.spyOn(mockMaterialsRepo, 'findById').mockResolvedValue(mockMaterial);
      vi.spyOn(mockTeachersRepo, 'findByUserId').mockResolvedValue(mockTeacher);
      const deleteSpy = vi.spyOn(mockMaterialsRepo, 'softDelete').mockResolvedValue(true);

      await service.deleteMaterial(chapterId, mockMaterial.id, userId, schoolId, 'teacher');

      expect(deleteSpy).toHaveBeenCalledWith(mockMaterial.id);
    });

    it('throws ForbiddenError if another teacher tries to delete material', async () => {
      vi.spyOn(mockChaptersRepo, 'findById').mockResolvedValue(mockChapter);
      vi.spyOn(mockMaterialsRepo, 'findById').mockResolvedValue(mockMaterial);
      vi.spyOn(mockTeachersRepo, 'findByUserId').mockResolvedValue({
        ...mockTeacher,
        id: 'different-teacher',
      });

      await expect(
        service.deleteMaterial(chapterId, mockMaterial.id, 'other-user', schoolId, 'teacher'),
      ).rejects.toThrow(ForbiddenError);
    });

    it('allows admin to delete material authored by any teacher in school', async () => {
      vi.spyOn(mockChaptersRepo, 'findById').mockResolvedValue(mockChapter);
      vi.spyOn(mockMaterialsRepo, 'findById').mockResolvedValue(mockMaterial);
      const deleteSpy = vi.spyOn(mockMaterialsRepo, 'softDelete').mockResolvedValue(true);

      await service.deleteMaterial(chapterId, mockMaterial.id, 'admin-user', schoolId, 'admin');

      expect(deleteSpy).toHaveBeenCalledWith(mockMaterial.id);
    });
  });
});
