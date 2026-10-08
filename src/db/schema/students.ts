import { pgTable, uuid, text, timestamp, pgEnum, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { schools } from './schools.js';
import { boards } from './boards.js';
import { grades } from './grades.js';
import { users } from './users.js';

export const studentStatusEnum = pgEnum('student_status', [
  'active',
  'inactive',
  'transferred',
  'graduated',
  'suspended',
]);

export const studentGenderEnum = pgEnum('student_gender', ['male', 'female', 'other']);

export const students = pgTable(
  'students',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    schoolId: uuid('school_id')
      .notNull()
      .references(() => schools.id, { onDelete: 'cascade' }),
    boardId: uuid('board_id')
      .notNull()
      .references(() => boards.id, { onDelete: 'cascade' }),
    gradeId: uuid('grade_id')
      .notNull()
      .references(() => grades.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    admissionNumber: text('admission_number').notNull(),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    dateOfBirth: timestamp('date_of_birth', { withTimezone: true, mode: 'date' }),
    gender: studentGenderEnum('gender'),
    email: text('email'),
    phone: text('phone'),
    guardianName: text('guardian_name'),
    guardianPhone: text('guardian_phone'),
    guardianEmail: text('guardian_email'),
    address: text('address'),
    status: studentStatusEnum('status').default('active').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'date' }),
  },
  (table) => [
    uniqueIndex('students_school_admission_number_lower_idx').on(
      table.schoolId,
      sql`lower(${table.admissionNumber})`,
    ),
    index('students_school_id_idx').on(table.schoolId),
    index('students_board_id_idx').on(table.boardId),
    index('students_grade_id_idx').on(table.gradeId),
    index('students_grade_status_idx').on(table.gradeId, table.status),
    index('students_user_id_idx').on(table.userId),
    index('students_created_at_id_idx').on(table.createdAt, table.id),
    index('students_deleted_at_idx').on(table.deletedAt),
  ],
);

export type Student = typeof students.$inferSelect;
export type NewStudent = typeof students.$inferInsert;
export type StudentStatus = (typeof studentStatusEnum.enumValues)[number];
export type StudentGender = (typeof studentGenderEnum.enumValues)[number];
