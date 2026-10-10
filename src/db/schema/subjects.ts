import { pgTable, uuid, text, timestamp, pgEnum, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { schools } from './schools.js';
import { grades } from './grades.js';

export const subjectStatusEnum = pgEnum('subject_status', ['active', 'inactive', 'archived']);
export const gradeSubjectStatusEnum = pgEnum('grade_subject_status', ['active', 'inactive']);

export const subjects = pgTable(
  'subjects',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    schoolId: uuid('school_id')
      .notNull()
      .references(() => schools.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    code: text('code').notNull(),
    description: text('description'),
    status: subjectStatusEnum('status').default('active').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'date' }),
  },
  (table) => [
    uniqueIndex('subjects_school_code_lower_idx').on(table.schoolId, sql`lower(${table.code})`),
    index('subjects_school_id_idx').on(table.schoolId),
    index('subjects_school_status_idx').on(table.schoolId, table.status),
    index('subjects_status_idx').on(table.status),
    index('subjects_code_idx').on(table.code),
    index('subjects_created_at_id_idx').on(table.createdAt, table.id),
    index('subjects_deleted_at_idx').on(table.deletedAt),
  ],
);

export const gradeSubjects = pgTable(
  'grade_subjects',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    schoolId: uuid('school_id')
      .notNull()
      .references(() => schools.id, { onDelete: 'cascade' }),
    gradeId: uuid('grade_id')
      .notNull()
      .references(() => grades.id, { onDelete: 'cascade' }),
    subjectId: uuid('subject_id')
      .notNull()
      .references(() => subjects.id, { onDelete: 'cascade' }),
    status: gradeSubjectStatusEnum('status').default('active').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('grade_subjects_grade_subject_idx').on(table.gradeId, table.subjectId),
    index('grade_subjects_school_id_idx').on(table.schoolId),
    index('grade_subjects_school_status_idx').on(table.schoolId, table.status),
    index('grade_subjects_grade_id_idx').on(table.gradeId),
    index('grade_subjects_grade_status_idx').on(table.gradeId, table.status),
    index('grade_subjects_subject_id_idx').on(table.subjectId),
    index('grade_subjects_status_idx').on(table.status),
  ],
);

export type Subject = typeof subjects.$inferSelect;
export type NewSubject = typeof subjects.$inferInsert;
export type SubjectStatus = (typeof subjectStatusEnum.enumValues)[number];

export type GradeSubject = typeof gradeSubjects.$inferSelect;
export type NewGradeSubject = typeof gradeSubjects.$inferInsert;
export type GradeSubjectStatus = (typeof gradeSubjectStatusEnum.enumValues)[number];
