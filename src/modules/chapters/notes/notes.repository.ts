import { eq, isNull, and, desc, ilike } from 'drizzle-orm';
import { db } from '../../../db/pool.js';
import { chapterNotes, type ChapterNote, type NoteType } from '../../../db/schema/chapter-notes.js';

export interface CreateChapterNoteData {
  schoolId: string;
  chapterId: string;
  subjectId: string;
  teacherId: string;
  title: string;
  content?: string | null | undefined;
  noteType: NoteType;
  fileUrl?: string | null | undefined;
  fileName?: string | null | undefined;
  fileSize?: number | null | undefined;
  mimeType?: string | null | undefined;
  isPublished?: boolean | undefined;
}

export interface UpdateChapterNoteData {
  title?: string | undefined;
  content?: string | null | undefined;
  noteType?: NoteType | undefined;
  fileUrl?: string | null | undefined;
  fileName?: string | null | undefined;
  fileSize?: number | null | undefined;
  mimeType?: string | null | undefined;
  isPublished?: boolean | undefined;
}

export interface ListNotesFilters {
  noteType?: NoteType | undefined;
  isPublished?: boolean | undefined;
  search?: string | undefined;
}

export class NotesRepository {
  async create(data: CreateChapterNoteData): Promise<ChapterNote> {
    const rows = await db
      .insert(chapterNotes)
      .values({
        schoolId: data.schoolId,
        chapterId: data.chapterId,
        subjectId: data.subjectId,
        teacherId: data.teacherId,
        title: data.title.trim(),
        content: data.content ?? null,
        noteType: data.noteType,
        fileUrl: data.fileUrl ?? null,
        fileName: data.fileName ?? null,
        fileSize: data.fileSize ?? null,
        mimeType: data.mimeType ?? null,
        isPublished: data.isPublished ?? true,
      })
      .returning();

    const created = rows[0];
    if (!created) {
      throw new Error('Failed to create chapter note');
    }
    return created;
  }

  async findById(id: string, includeDeleted = false): Promise<ChapterNote | null> {
    const conditions = [eq(chapterNotes.id, id)];
    if (!includeDeleted) {
      conditions.push(isNull(chapterNotes.deletedAt));
    }

    const rows = await db
      .select()
      .from(chapterNotes)
      .where(and(...conditions))
      .limit(1);

    return rows[0] ?? null;
  }

  async listByChapter(chapterId: string, filters?: ListNotesFilters): Promise<ChapterNote[]> {
    const conditions = [eq(chapterNotes.chapterId, chapterId), isNull(chapterNotes.deletedAt)];

    if (filters?.noteType) {
      conditions.push(eq(chapterNotes.noteType, filters.noteType));
    }

    if (filters?.isPublished !== undefined) {
      conditions.push(eq(chapterNotes.isPublished, filters.isPublished));
    }

    if (filters?.search) {
      const searchPattern = `%${filters.search.trim()}%`;
      conditions.push(ilike(chapterNotes.title, searchPattern));
    }

    return db
      .select()
      .from(chapterNotes)
      .where(and(...conditions))
      .orderBy(desc(chapterNotes.createdAt));
  }

  async update(id: string, data: UpdateChapterNoteData): Promise<ChapterNote | null> {
    const updateValues: Partial<typeof chapterNotes.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (data.title !== undefined) updateValues.title = data.title.trim();
    if (data.content !== undefined) updateValues.content = data.content;
    if (data.noteType !== undefined) updateValues.noteType = data.noteType;
    if (data.fileUrl !== undefined) updateValues.fileUrl = data.fileUrl;
    if (data.fileName !== undefined) updateValues.fileName = data.fileName;
    if (data.fileSize !== undefined) updateValues.fileSize = data.fileSize;
    if (data.mimeType !== undefined) updateValues.mimeType = data.mimeType;
    if (data.isPublished !== undefined) updateValues.isPublished = data.isPublished;

    const rows = await db
      .update(chapterNotes)
      .set(updateValues)
      .where(and(eq(chapterNotes.id, id), isNull(chapterNotes.deletedAt)))
      .returning();

    return rows[0] ?? null;
  }

  async softDelete(id: string): Promise<boolean> {
    const rows = await db
      .update(chapterNotes)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(chapterNotes.id, id), isNull(chapterNotes.deletedAt)))
      .returning({ id: chapterNotes.id });

    return rows.length > 0;
  }
}

export const notesRepository = new NotesRepository();
