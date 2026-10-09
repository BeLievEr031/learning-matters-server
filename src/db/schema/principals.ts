import { pgTable, uuid, text, timestamp, pgEnum, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { schools } from './schools.js';
import { users } from './users.js';

export const principalStatusEnum = pgEnum('principal_status', ['active', 'inactive']);

export const principals = pgTable(
  'principals',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    schoolId: uuid('school_id')
      .notNull()
      .references(() => schools.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    employeeId: text('employee_id').notNull(),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    email: text('email').notNull(),
    phone: text('phone'),
    status: principalStatusEnum('status').default('active').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('principals_school_id_unique').on(table.schoolId),
    uniqueIndex('principals_user_id_unique').on(table.userId),
    index('principals_school_id_idx').on(table.schoolId),
    index('principals_status_idx').on(table.status),
    index('principals_user_id_idx').on(table.userId),
    index('principals_created_at_id_idx').on(table.createdAt, table.id),
  ],
);

export type Principal = typeof principals.$inferSelect;
export type NewPrincipal = typeof principals.$inferInsert;
export type PrincipalStatus = (typeof principalStatusEnum.enumValues)[number];
