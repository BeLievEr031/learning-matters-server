import { pgTable, uuid, text, integer, timestamp, pgEnum, index } from 'drizzle-orm/pg-core';
import { schools } from './schools.js';
import { subjects } from './subjects.js';
import { chapters } from './chapters.js';
import { teachers } from './teachers.js';

export const materialTypeEnum = pgEnum('material_type', [
  'document',
  'worksheet',
  'presentation',
  'video_link',
  'reference_link',
]);

export const chapterMaterials = pgTable(
  'chapter_materials',
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
    description: text('description'),
    materialType: materialTypeEnum('material_type').default('document').notNull(),
    fileUrl: text('file_url'),
    fileName: text('file_name'),
    fileSize: integer('file_size'),
    mimeType: text('mime_type'),
    externalUrl: text('external_url'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'date' }),
  },
  (table) => [
    index('chapter_materials_school_id_idx').on(table.schoolId),
    index('chapter_materials_chapter_id_idx').on(table.chapterId),
    index('chapter_materials_subject_id_idx').on(table.subjectId),
    index('chapter_materials_teacher_id_idx').on(table.teacherId),
    index('chapter_materials_created_at_id_idx').on(table.createdAt, table.id),
    index('chapter_materials_deleted_at_idx').on(table.deletedAt),
  ],
);

export type ChapterMaterial = typeof chapterMaterials.$inferSelect;
export type NewChapterMaterial = typeof chapterMaterials.$inferInsert;
export type MaterialType = (typeof materialTypeEnum.enumValues)[number];
