import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotesService } from './notes.service.js';
import { NotesRepository } from './notes.repository.js';
import { ChaptersRepository } from '../chapters.repository.js';
import { TeachersRepository } from '../../teachers/teachers.repository.js';
import type { ChapterNote } from '../../../db/schema/chapter-notes.js';
import type { Chapter } from '../../../db/schema/chapters.js';
import type { Teacher } from '../../../db/schema/teachers.js';
import { NotFoundError, ForbiddenError } from '../../../lib/app-error.js';

describe('NotesService', () => {
  let service: NotesService;
  let mockNotesRepo: NotesRepository;
  let mockChaptersRepo: ChaptersRepository;
  let mockTeachersRepo: TeachersRepository;

  const schoolId = '11111111-1111-4111-a111-111111111111';
  const _otherSchoolId = '22222222-2222-4222-a222-222222222222';
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

  const mockPublishedNote: ChapterNote = {
    id: 'note-1',
    schoolId,
    chapterId,
    subjectId,
    teacherId,
    title: 'Quadratic Equations Summary',
    content: '## Formulas\n$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$',
    noteType: 'lecture_note',
    fileUrl: null,
    fileName: null,
    fileSize: null,
    mimeType: null,
    isPublished: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockDraftNote: ChapterNote = {
    ...mockPublishedNote,
    id: 'note-2',
    title: 'Unpublished Draft Note',
    isPublished: false,
  };

  beforeEach(() => {
    mockNotesRepo = new NotesRepository();
    mockChaptersRepo = new ChaptersRepository();
    mockTeachersRepo = new TeachersRepository();
    service = new NotesService(mockNotesRepo, mockChaptersRepo, mockTeachersRepo);
  });

  describe('createNote', () => {
    it('creates published note successfully for assigned teacher', async () => {
      vi.spyOn(mockChaptersRepo, 'findById').mockResolvedValue(mockChapter);
      vi.spyOn(mockTeachersRepo, 'findByUserId').mockResolvedValue(mockTeacher);
      vi.spyOn(mockTeachersRepo, 'hasTeacherSubjectAssignment').mockResolvedValue(true);
      const createSpy = vi.spyOn(mockNotesRepo, 'create').mockResolvedValue(mockPublishedNote);

      const result = await service.createNote(
        chapterId,
        {
          title: 'Quadratic Equations Summary',
          content: 'Formulas',
          noteType: 'lecture_note',
          isPublished: true,
        },
        undefined,
        userId,
        schoolId,
        'teacher',
      );

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          chapterId,
          subjectId,
          teacherId,
          title: 'Quadratic Equations Summary',
          isPublished: true,
        }),
      );
      expect(result).toEqual(mockPublishedNote);
    });

    it('throws ForbiddenError if teacher does not teach this subject', async () => {
      vi.spyOn(mockChaptersRepo, 'findById').mockResolvedValue(mockChapter);
      vi.spyOn(mockTeachersRepo, 'findByUserId').mockResolvedValue(mockTeacher);
      vi.spyOn(mockTeachersRepo, 'hasTeacherSubjectAssignment').mockResolvedValue(false);

      await expect(
        service.createNote(
          chapterId,
          { title: 'Note', noteType: 'lecture_note', isPublished: true },
          undefined,
          userId,
          schoolId,
          'teacher',
        ),
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('listNotesByChapter', () => {
    it('filters out unpublished notes for students', async () => {
      vi.spyOn(mockChaptersRepo, 'findById').mockResolvedValue(mockChapter);
      const listSpy = vi
        .spyOn(mockNotesRepo, 'listByChapter')
        .mockResolvedValue([mockPublishedNote]);

      const result = await service.listNotesByChapter(chapterId, {}, schoolId, 'student');

      expect(listSpy).toHaveBeenCalledWith(
        chapterId,
        expect.objectContaining({ isPublished: true }),
      );
      expect(result).toEqual([mockPublishedNote]);
    });

    it('allows teacher to see all notes including unpublished drafts', async () => {
      vi.spyOn(mockChaptersRepo, 'findById').mockResolvedValue(mockChapter);
      const listSpy = vi
        .spyOn(mockNotesRepo, 'listByChapter')
        .mockResolvedValue([mockPublishedNote, mockDraftNote]);

      const result = await service.listNotesByChapter(chapterId, {}, schoolId, 'teacher');

      expect(listSpy).toHaveBeenCalledWith(
        chapterId,
        expect.not.objectContaining({ isPublished: true }),
      );
      expect(result).toHaveLength(2);
    });
  });

  describe('getNoteById', () => {
    it('returns published note to student', async () => {
      vi.spyOn(mockChaptersRepo, 'findById').mockResolvedValue(mockChapter);
      vi.spyOn(mockNotesRepo, 'findById').mockResolvedValue(mockPublishedNote);

      const result = await service.getNoteById(
        chapterId,
        mockPublishedNote.id,
        schoolId,
        'student',
      );

      expect(result).toEqual(mockPublishedNote);
    });

    it('returns NotFoundError to student attempting to view unpublished draft note', async () => {
      vi.spyOn(mockChaptersRepo, 'findById').mockResolvedValue(mockChapter);
      vi.spyOn(mockNotesRepo, 'findById').mockResolvedValue(mockDraftNote);

      await expect(
        service.getNoteById(chapterId, mockDraftNote.id, schoolId, 'student'),
      ).rejects.toThrow(NotFoundError);
    });

    it('allows teacher to view unpublished draft note', async () => {
      vi.spyOn(mockChaptersRepo, 'findById').mockResolvedValue(mockChapter);
      vi.spyOn(mockNotesRepo, 'findById').mockResolvedValue(mockDraftNote);

      const result = await service.getNoteById(chapterId, mockDraftNote.id, schoolId, 'teacher');

      expect(result).toEqual(mockDraftNote);
    });
  });

  describe('updateNote', () => {
    it('allows author teacher to update note', async () => {
      vi.spyOn(mockChaptersRepo, 'findById').mockResolvedValue(mockChapter);
      vi.spyOn(mockNotesRepo, 'findById').mockResolvedValue(mockPublishedNote);
      vi.spyOn(mockTeachersRepo, 'findByUserId').mockResolvedValue(mockTeacher);
      const updateSpy = vi.spyOn(mockNotesRepo, 'update').mockResolvedValue({
        ...mockPublishedNote,
        title: 'Updated Title',
      });

      const result = await service.updateNote(
        chapterId,
        mockPublishedNote.id,
        { title: 'Updated Title' },
        undefined,
        userId,
        schoolId,
        'teacher',
      );

      expect(updateSpy).toHaveBeenCalledWith(
        mockPublishedNote.id,
        expect.objectContaining({ title: 'Updated Title' }),
      );
      expect(result.title).toBe('Updated Title');
    });

    it('throws ForbiddenError if another teacher tries to update note', async () => {
      vi.spyOn(mockChaptersRepo, 'findById').mockResolvedValue(mockChapter);
      vi.spyOn(mockNotesRepo, 'findById').mockResolvedValue(mockPublishedNote);
      vi.spyOn(mockTeachersRepo, 'findByUserId').mockResolvedValue({
        ...mockTeacher,
        id: 'different-teacher',
      });

      await expect(
        service.updateNote(
          chapterId,
          mockPublishedNote.id,
          { title: 'Hack Title' },
          undefined,
          'other-user',
          schoolId,
          'teacher',
        ),
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('deleteNote', () => {
    it('allows author teacher to soft-delete note', async () => {
      vi.spyOn(mockChaptersRepo, 'findById').mockResolvedValue(mockChapter);
      vi.spyOn(mockNotesRepo, 'findById').mockResolvedValue(mockPublishedNote);
      vi.spyOn(mockTeachersRepo, 'findByUserId').mockResolvedValue(mockTeacher);
      const deleteSpy = vi.spyOn(mockNotesRepo, 'softDelete').mockResolvedValue(true);

      await service.deleteNote(chapterId, mockPublishedNote.id, userId, schoolId, 'teacher');

      expect(deleteSpy).toHaveBeenCalledWith(mockPublishedNote.id);
    });

    it('throws ForbiddenError if another teacher tries to delete note', async () => {
      vi.spyOn(mockChaptersRepo, 'findById').mockResolvedValue(mockChapter);
      vi.spyOn(mockNotesRepo, 'findById').mockResolvedValue(mockPublishedNote);
      vi.spyOn(mockTeachersRepo, 'findByUserId').mockResolvedValue({
        ...mockTeacher,
        id: 'different-teacher',
      });

      await expect(
        service.deleteNote(chapterId, mockPublishedNote.id, 'other-user', schoolId, 'teacher'),
      ).rejects.toThrow(ForbiddenError);
    });
  });
});
