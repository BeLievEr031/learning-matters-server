import {
  notesRepository,
  type NotesRepository,
  type ListNotesFilters,
} from './notes.repository.js';
import { chaptersRepository, type ChaptersRepository } from '../chapters.repository.js';
import { teachersRepository, type TeachersRepository } from '../../teachers/teachers.repository.js';
import type { ChapterNote } from '../../../db/schema/chapter-notes.js';
import type { CreateNoteInput, UpdateNoteInput } from './notes.schemas.js';
import type { UserRole } from '../../../db/schema/users.js';
import { NotFoundError, ForbiddenError, BadRequestError } from '../../../lib/app-error.js';

export class NotesService {
  constructor(
    private readonly repo: NotesRepository = notesRepository,
    private readonly chaptersRepo: ChaptersRepository = chaptersRepository,
    private readonly teachersRepo: TeachersRepository = teachersRepository,
  ) {}

  async createNote(
    chapterId: string,
    input: CreateNoteInput,
    file?: Express.Multer.File,
    callerUserId?: string,
    callerSchoolId?: string | null,
    callerRole?: UserRole,
  ): Promise<ChapterNote> {
    const chapter = await this.chaptersRepo.findById(chapterId);
    if (!chapter) {
      throw new NotFoundError('Chapter not found');
    }

    if (callerRole !== 'super_admin' && chapter.schoolId !== callerSchoolId) {
      throw new ForbiddenError('Forbidden: Cannot add notes to chapters in another school');
    }

    let teacherId: string | null = null;
    if (callerRole === 'teacher' || callerRole === 'class_teacher') {
      if (!callerUserId) {
        throw new ForbiddenError('Teacher user ID is required');
      }
      const teacher = await this.teachersRepo.findByUserId(callerUserId);
      if (!teacher) {
        throw new NotFoundError('Teacher profile not found for this account');
      }

      const hasAssignment = await this.teachersRepo.hasTeacherSubjectAssignment(
        teacher.id,
        chapter.subjectId,
      );
      if (!hasAssignment) {
        throw new ForbiddenError(
          'Forbidden: You are not assigned to teach the subject of this chapter',
        );
      }
      teacherId = teacher.id;
    } else {
      if (callerUserId) {
        const teacher = await this.teachersRepo.findByUserId(callerUserId);
        if (teacher) {
          teacherId = teacher.id;
        }
      }
      if (!teacherId) {
        const fallbackTeachers = await this.teachersRepo.listBySchool(chapter.schoolId, 1);
        const fallbackTeacher = fallbackTeachers[0];
        if (!fallbackTeacher) {
          throw new BadRequestError('No teacher profile found to attribute note upload');
        }
        teacherId = fallbackTeacher.id;
      }
    }

    let fileUrl = input.fileUrl ?? null;
    let fileName = input.fileName ?? null;
    let fileSize = input.fileSize ?? null;
    let mimeType = input.mimeType ?? null;

    if (file) {
      fileUrl = `/uploads/${file.filename}`;
      fileName = file.originalname;
      fileSize = file.size;
      mimeType = file.mimetype;
    }

    return this.repo.create({
      schoolId: chapter.schoolId,
      chapterId: chapter.id,
      subjectId: chapter.subjectId,
      teacherId,
      title: input.title,
      content: input.content ?? null,
      noteType: input.noteType,
      fileUrl,
      fileName,
      fileSize,
      mimeType,
      isPublished: input.isPublished,
    });
  }

  async listNotesByChapter(
    chapterId: string,
    filters?: ListNotesFilters,
    callerSchoolId?: string | null,
    callerRole?: UserRole,
  ): Promise<ChapterNote[]> {
    const chapter = await this.chaptersRepo.findById(chapterId);
    if (!chapter) {
      throw new NotFoundError('Chapter not found');
    }

    if (callerRole !== 'super_admin' && chapter.schoolId !== callerSchoolId) {
      throw new ForbiddenError('Forbidden: Cannot access notes from another school');
    }

    const effectiveFilters: ListNotesFilters = { ...filters };
    if (callerRole === 'student') {
      // Students only see published notes
      effectiveFilters.isPublished = true;
    }

    return this.repo.listByChapter(chapterId, effectiveFilters);
  }

  async getNoteById(
    chapterId: string,
    noteId: string,
    callerSchoolId?: string | null,
    callerRole?: UserRole,
  ): Promise<ChapterNote> {
    const chapter = await this.chaptersRepo.findById(chapterId);
    if (!chapter) {
      throw new NotFoundError('Chapter not found');
    }

    if (callerRole !== 'super_admin' && chapter.schoolId !== callerSchoolId) {
      throw new ForbiddenError('Forbidden: Cannot access notes from another school');
    }

    const note = await this.repo.findById(noteId);
    if (note?.chapterId !== chapterId) {
      throw new NotFoundError('Note not found');
    }

    if (callerRole === 'student' && !note.isPublished) {
      throw new NotFoundError('Note not found');
    }

    return note;
  }

  async updateNote(
    chapterId: string,
    noteId: string,
    input: UpdateNoteInput,
    file?: Express.Multer.File,
    callerUserId?: string,
    callerSchoolId?: string | null,
    callerRole?: UserRole,
  ): Promise<ChapterNote> {
    const chapter = await this.chaptersRepo.findById(chapterId);
    if (!chapter) {
      throw new NotFoundError('Chapter not found');
    }

    if (callerRole !== 'super_admin' && chapter.schoolId !== callerSchoolId) {
      throw new ForbiddenError('Forbidden: Cannot modify notes in another school');
    }

    const note = await this.repo.findById(noteId);
    if (note?.chapterId !== chapterId) {
      throw new NotFoundError('Note not found');
    }

    if (callerRole === 'teacher' || callerRole === 'class_teacher') {
      if (!callerUserId) {
        throw new ForbiddenError('Teacher user ID is required');
      }
      const teacher = await this.teachersRepo.findByUserId(callerUserId);
      if (note.teacherId !== teacher?.id) {
        throw new ForbiddenError('Forbidden: You can only edit notes that you authored');
      }
    }

    const updatePayload: Record<string, unknown> = { ...input };

    if (file) {
      updatePayload.fileUrl = `/uploads/${file.filename}`;
      updatePayload.fileName = file.originalname;
      updatePayload.fileSize = file.size;
      updatePayload.mimeType = file.mimetype;
    }

    const updated = await this.repo.update(noteId, updatePayload);
    if (!updated) {
      throw new NotFoundError('Note not found');
    }

    return updated;
  }

  async deleteNote(
    chapterId: string,
    noteId: string,
    callerUserId?: string,
    callerSchoolId?: string | null,
    callerRole?: UserRole,
  ): Promise<void> {
    const chapter = await this.chaptersRepo.findById(chapterId);
    if (!chapter) {
      throw new NotFoundError('Chapter not found');
    }

    if (callerRole !== 'super_admin' && chapter.schoolId !== callerSchoolId) {
      throw new ForbiddenError('Forbidden: Cannot delete notes in another school');
    }

    const note = await this.repo.findById(noteId);
    if (note?.chapterId !== chapterId) {
      throw new NotFoundError('Note not found');
    }

    if (callerRole === 'teacher' || callerRole === 'class_teacher') {
      if (!callerUserId) {
        throw new ForbiddenError('Teacher user ID is required');
      }
      const teacher = await this.teachersRepo.findByUserId(callerUserId);
      if (note.teacherId !== teacher?.id) {
        throw new ForbiddenError('Forbidden: You can only delete notes that you authored');
      }
    }

    await this.repo.softDelete(noteId);
  }
}

export const notesService = new NotesService();
