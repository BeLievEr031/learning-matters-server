import { pgTable, uuid, text, timestamp, pgEnum, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const schoolStatusEnum = pgEnum('school_status', ['active', 'inactive', 'suspended']);

export const schools = pgTable(
  'schools',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    code: text('code').notNull().unique(),
    address: text('address'),
    city: text('city'),
    state: text('state'),
    country: text('country'),
    phone: text('phone'),
    email: text('email'),
    website: text('website'),
    logoUrl: text('logo_url'),
    status: schoolStatusEnum('status').default('active').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'date' }),
  },
  (table) => [
    uniqueIndex('schools_code_lower_idx').on(sql`lower(${table.code})`),
    index('schools_status_idx').on(table.status),
    index('schools_code_idx').on(table.code),
    index('schools_created_at_id_idx').on(table.createdAt, table.id),
    index('schools_deleted_at_idx').on(table.deletedAt),
  ],
);

export type School = typeof schools.$inferSelect;
export type NewSchool = typeof schools.$inferInsert;
export type SchoolStatus = (typeof schoolStatusEnum.enumValues)[number];
