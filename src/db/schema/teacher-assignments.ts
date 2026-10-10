import { pgTable, uuid, timestamp, pgEnum, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { schools } from './schools.js';
import { teachers } from './teachers.js';
import { grades } from './grades.js';
import { subjects } from './subjects.js';
import { users } from './users.js';

export const teacherAssignmentStatusEnum = pgEnum('teacher_assignment_status', [
  'active',
  'inactive',
]);

export const teacherAssignments = pgTable(
  'teacher_assignments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    schoolId: uuid('school_id')
      .notNull()
      .references(() => schools.id, { onDelete: 'cascade' }),
    teacherId: uuid('teacher_id')
      .notNull()
      .references(() => teachers.id, { onDelete: 'cascade' }),
    gradeId: uuid('grade_id')
      .notNull()
      .references(() => grades.id, { onDelete: 'cascade' }),
    subjectId: uuid('subject_id')
      .notNull()
      .references(() => subjects.id, { onDelete: 'cascade' }),
    assignedBy: uuid('assigned_by').references(() => users.id, { onDelete: 'set null' }),
    status: teacherAssignmentStatusEnum('status').default('active').notNull(),
    effectiveDate: timestamp('effective_date', { withTimezone: true, mode: 'date' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'date' }),
  },
  (table) => [
    uniqueIndex('teacher_assignments_unique_idx').on(
      table.teacherId,
      table.gradeId,
      table.subjectId,
    ),
    index('teacher_assignments_school_id_idx').on(table.schoolId),
    index('teacher_assignments_school_status_idx').on(table.schoolId, table.status),
    index('teacher_assignments_teacher_id_idx').on(table.teacherId),
    index('teacher_assignments_teacher_status_idx').on(table.teacherId, table.status),
    index('teacher_assignments_grade_id_idx').on(table.gradeId),
    index('teacher_assignments_grade_status_idx').on(table.gradeId, table.status),
    index('teacher_assignments_subject_id_idx').on(table.subjectId),
    index('teacher_assignments_status_idx').on(table.status),
    index('teacher_assignments_assigned_by_idx').on(table.assignedBy),
    index('teacher_assignments_created_at_id_idx').on(table.createdAt, table.id),
    index('teacher_assignments_deleted_at_idx').on(table.deletedAt),
  ],
);

export type TeacherAssignment = typeof teacherAssignments.$inferSelect;
export type NewTeacherAssignment = typeof teacherAssignments.$inferInsert;
export type TeacherAssignmentStatus = (typeof teacherAssignmentStatusEnum.enumValues)[number];
