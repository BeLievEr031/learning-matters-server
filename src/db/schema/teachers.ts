import { pgTable, uuid, text, timestamp, pgEnum, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { schools } from './schools.js';
import { users } from './users.js';

export const teacherStatusEnum = pgEnum('teacher_status', [
  'active',
  'inactive',
  'on_leave',
  'terminated',
]);

export const teachers = pgTable(
  'teachers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    schoolId: uuid('school_id')
      .notNull()
      .references(() => schools.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    employeeId: text('employee_id').notNull(),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    email: text('email').notNull(),
    phone: text('phone'),
    joiningDate: timestamp('joining_date', { withTimezone: true, mode: 'date' }),
    qualification: text('qualification'),
    status: teacherStatusEnum('status').default('active').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'date' }),
  },
  (table) => [
    uniqueIndex('teachers_school_employee_id_lower_idx').on(
      table.schoolId,
      sql`lower(${table.employeeId})`,
    ),
    uniqueIndex('teachers_school_email_lower_idx').on(table.schoolId, sql`lower(${table.email})`),
    index('teachers_school_id_idx').on(table.schoolId),
    index('teachers_status_idx').on(table.status),
    index('teachers_user_id_idx').on(table.userId),
    index('teachers_created_at_id_idx').on(table.createdAt, table.id),
    index('teachers_deleted_at_idx').on(table.deletedAt),
  ],
);

export type Teacher = typeof teachers.$inferSelect;
export type NewTeacher = typeof teachers.$inferInsert;
export type TeacherStatus = (typeof teacherStatusEnum.enumValues)[number];
