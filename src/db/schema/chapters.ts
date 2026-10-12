import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  pgEnum,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { schools } from './schools.js';
import { subjects } from './subjects.js';

export const chapterStatusEnum = pgEnum('chapter_status', ['active', 'inactive', 'archived']);

export const chapters = pgTable(
  'chapters',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    schoolId: uuid('school_id')
      .notNull()
      .references(() => schools.id, { onDelete: 'cascade' }),
    subjectId: uuid('subject_id')
      .notNull()
      .references(() => subjects.id, { onDelete: 'cascade' }),
    chapterNumber: integer('chapter_number').notNull(),
    title: text('title').notNull(),
    description: text('description'),
    status: chapterStatusEnum('status').default('active').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'date' }),
  },
  (table) => [
    uniqueIndex('chapters_subject_chapter_number_idx')
      .on(table.subjectId, table.chapterNumber)
      .where(sql`${table.deletedAt} IS NULL`),
    index('chapters_school_id_idx').on(table.schoolId),
    index('chapters_subject_id_idx').on(table.subjectId),
    index('chapters_subject_status_idx').on(table.subjectId, table.status),
    index('chapters_created_at_id_idx').on(table.createdAt, table.id),
    index('chapters_deleted_at_idx').on(table.deletedAt),
  ],
);

export type Chapter = typeof chapters.$inferSelect;
export type NewChapter = typeof chapters.$inferInsert;
export type ChapterStatus = (typeof chapterStatusEnum.enumValues)[number];
