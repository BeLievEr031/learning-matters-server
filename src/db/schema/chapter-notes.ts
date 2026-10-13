import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import { schools } from './schools.js';
import { subjects } from './subjects.js';
import { chapters } from './chapters.js';
import { teachers } from './teachers.js';

export const noteTypeEnum = pgEnum('note_type', [
  'lecture_note',
  'revision_summary',
  'handwritten_note',
  'study_guide',
]);

export const chapterNotes = pgTable(
  'chapter_notes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    schoolId: uuid('school_id')
      .notNull()
      .references(() => schools.id, { onDelete: 'cascade' }),
    chapterId: uuid('chapter_id')
      .notNull()
      .references(() => chapters.id, { onDelete: 'cascade' }),
    subjectId: uuid('subject_id')
      .notNull()
      .references(() => subjects.id, { onDelete: 'cascade' }),
    teacherId: uuid('teacher_id')
      .notNull()
      .references(() => teachers.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    content: text('content'),
    noteType: noteTypeEnum('note_type').default('lecture_note').notNull(),
    fileUrl: text('file_url'),
    fileName: text('file_name'),
    fileSize: integer('file_size'),
    mimeType: text('mime_type'),
    isPublished: boolean('is_published').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'date' }),
  },
  (table) => [
    index('chapter_notes_school_id_idx').on(table.schoolId),
    index('chapter_notes_chapter_id_idx').on(table.chapterId),
    index('chapter_notes_subject_id_idx').on(table.subjectId),
    index('chapter_notes_teacher_id_idx').on(table.teacherId),
    index('chapter_notes_is_published_idx').on(table.isPublished),
    index('chapter_notes_created_at_id_idx').on(table.createdAt, table.id),
    index('chapter_notes_deleted_at_idx').on(table.deletedAt),
  ],
);

export type ChapterNote = typeof chapterNotes.$inferSelect;
export type NewChapterNote = typeof chapterNotes.$inferInsert;
export type NoteType = (typeof noteTypeEnum.enumValues)[number];
