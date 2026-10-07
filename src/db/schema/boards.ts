import { pgTable, uuid, text, timestamp, pgEnum, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { schools } from './schools.js';

export const boardStatusEnum = pgEnum('board_status', ['active', 'inactive', 'archived']);

export const boards = pgTable(
  'boards',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    schoolId: uuid('school_id')
      .notNull()
      .references(() => schools.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    code: text('code').notNull(),
    description: text('description'),
    status: boardStatusEnum('status').default('active').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'date' }),
  },
  (table) => [
    uniqueIndex('boards_school_code_lower_idx').on(table.schoolId, sql`lower(${table.code})`),
    index('boards_school_id_idx').on(table.schoolId),
    index('boards_status_idx').on(table.status),
    index('boards_code_idx').on(table.code),
    index('boards_created_at_id_idx').on(table.createdAt, table.id),
    index('boards_deleted_at_idx').on(table.deletedAt),
  ],
);

export type Board = typeof boards.$inferSelect;
export type NewBoard = typeof boards.$inferInsert;
export type BoardStatus = (typeof boardStatusEnum.enumValues)[number];
