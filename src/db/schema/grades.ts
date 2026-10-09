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
import { boards } from './boards.js';
import { teachers } from './teachers.js';

export const gradeStatusEnum = pgEnum('grade_status', ['active', 'inactive', 'archived']);

export const grades = pgTable(
  'grades',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    schoolId: uuid('school_id')
      .notNull()
      .references(() => schools.id, { onDelete: 'cascade' }),
    boardId: uuid('board_id')
      .notNull()
      .references(() => boards.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    code: text('code').notNull(),
    gradeNumber: integer('grade_number').notNull(),
    section: text('section'),
    capacity: integer('capacity'),
    classTeacherId: uuid('class_teacher_id').references(() => teachers.id, {
      onDelete: 'set null',
    }),
    status: gradeStatusEnum('status').default('active').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'date' }),
  },
  (table) => [
    uniqueIndex('grades_board_grade_section_idx').on(
      table.boardId,
      table.gradeNumber,
      sql`coalesce(${table.section}, '')`,
    ),
    index('grades_school_id_idx').on(table.schoolId),
    index('grades_board_id_idx').on(table.boardId),
    index('grades_class_teacher_id_idx').on(table.classTeacherId),
    index('grades_status_idx').on(table.status),
    index('grades_grade_number_idx').on(table.gradeNumber),
    index('grades_created_at_id_idx').on(table.createdAt, table.id),
    index('grades_deleted_at_idx').on(table.deletedAt),
  ],
);

export type Grade = typeof grades.$inferSelect;
export type NewGrade = typeof grades.$inferInsert;
export type GradeStatus = (typeof gradeStatusEnum.enumValues)[number];
