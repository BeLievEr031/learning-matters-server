import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  pgEnum,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { schools } from './schools.js';

export const userRoleEnum = pgEnum('user_role', [
  'super_admin',
  'admin',
  'principal',
  'class_teacher',
  'teacher',
  'student',
]);

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    role: userRoleEnum('role').default('student').notNull(),
    // school_id is nullable: super_admin has NULL, all other roles reference a school
    schoolId: uuid('school_id').references(() => schools.id, { onDelete: 'set null' }),
    firstName: text('first_name'),
    lastName: text('last_name'),
    phone: text('phone'),
    status: text('status').default('active').notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'date' }),
  },
  (table) => [
    uniqueIndex('users_email_lower_idx').on(sql`lower(${table.email})`),
    index('users_created_at_id_idx').on(table.createdAt, table.id),
    index('users_deleted_at_idx').on(table.deletedAt),
    index('users_school_id_idx').on(table.schoolId),
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UserRole = (typeof userRoleEnum.enumValues)[number];
