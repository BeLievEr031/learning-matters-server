import { eq, isNull, and, or, lt, desc } from 'drizzle-orm';
import { db } from '../../db/pool.js';
import { users, type User, type UserRole } from '../../db/schema/users.js';
import type { CursorPayload } from '../../lib/pagination.js';

export type UserSafe = Omit<User, 'passwordHash'>;

export const userSafeColumns = {
  id: users.id,
  email: users.email,
  role: users.role,
  schoolId: users.schoolId,
  firstName: users.firstName,
  lastName: users.lastName,
  phone: users.phone,
  status: users.status,
  isActive: users.isActive,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
  deletedAt: users.deletedAt,
};

export interface UpdateUserData {
  email?: string | undefined;
  role?: UserRole | undefined;
  schoolId?: string | null | undefined;
  firstName?: string | null | undefined;
  lastName?: string | null | undefined;
  phone?: string | null | undefined;
  status?: string | undefined;
  isActive?: boolean | undefined;
}

export class UsersRepository {
  /**
   * Find a user by ID, excluding passwordHash and soft-deleted records by default.
   */
  async findById(id: string, includeDeleted = false): Promise<UserSafe | null> {
    const conditions = [eq(users.id, id)];
    if (!includeDeleted) {
      conditions.push(isNull(users.deletedAt));
    }

    const rows = await db
      .select(userSafeColumns)
      .from(users)
      .where(and(...conditions))
      .limit(1);

    return rows[0] ?? null;
  }

  /**
   * Find a user by email, excluding passwordHash and soft-deleted records by default.
   */
  async findByEmail(email: string, includeDeleted = false): Promise<UserSafe | null> {
    const conditions = [eq(users.email, email.toLowerCase())];
    if (!includeDeleted) {
      conditions.push(isNull(users.deletedAt));
    }

    const rows = await db
      .select(userSafeColumns)
      .from(users)
      .where(and(...conditions))
      .limit(1);

    return rows[0] ?? null;
  }

  /**
   * Internal method exclusively for authentication: fetches user with passwordHash.
   */
  async findForAuthByEmail(email: string): Promise<User | null> {
    const rows = await db
      .select()
      .from(users)
      .where(and(eq(users.email, email.toLowerCase()), isNull(users.deletedAt)))
      .limit(1);

    return rows[0] ?? null;
  }

  /**
   * Create a new user and return the safe representation (without passwordHash).
   */
  async create(data: {
    email: string;
    passwordHash: string;
    role?: UserRole;
    schoolId?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
  }): Promise<UserSafe> {
    const rows = await db
      .insert(users)
      .values({
        email: data.email.toLowerCase(),
        passwordHash: data.passwordHash,
        ...(data.role && { role: data.role }),
        ...(data.schoolId !== undefined && { schoolId: data.schoolId }),
        ...(data.firstName !== undefined && { firstName: data.firstName }),
        ...(data.lastName !== undefined && { lastName: data.lastName }),
        ...(data.phone !== undefined && { phone: data.phone }),
      })
      .returning(userSafeColumns);

    const created = rows[0];
    if (!created) {
      throw new Error('Failed to create user record');
    }
    return created;
  }

  /**
   * Update an existing user and return the updated safe user.
   */
  async update(id: string, data: UpdateUserData): Promise<UserSafe | null> {
    const updateValues: Record<string, unknown> = {};

    if (data.email !== undefined) {
      updateValues.email = data.email.toLowerCase();
    }
    if (data.role !== undefined) {
      updateValues.role = data.role;
    }
    if (data.schoolId !== undefined) {
      updateValues.schoolId = data.schoolId;
    }
    if (data.firstName !== undefined) {
      updateValues.firstName = data.firstName;
    }
    if (data.lastName !== undefined) {
      updateValues.lastName = data.lastName;
    }
    if (data.phone !== undefined) {
      updateValues.phone = data.phone;
    }
    if (data.status !== undefined) {
      updateValues.status = data.status;
    }
    if (data.isActive !== undefined) {
      updateValues.isActive = data.isActive;
    }

    if (Object.keys(updateValues).length === 0) {
      return this.findById(id);
    }

    const rows = await db
      .update(users)
      .set(updateValues)
      .where(and(eq(users.id, id), isNull(users.deletedAt)))
      .returning(userSafeColumns);

    return rows[0] ?? null;
  }

  /**
   * Soft-delete a user by populating deletedAt timestamp.
   */
  async softDelete(id: string): Promise<boolean> {
    const rows = await db
      .update(users)
      .set({ deletedAt: new Date() })
      .where(and(eq(users.id, id), isNull(users.deletedAt)))
      .returning({ id: users.id });

    return rows.length > 0;
  }

  /**
   * Cursor-paginated list of non-deleted users ordered by (createdAt DESC, id DESC).
   * Fetches (limit + 1) rows to determine hasMore and nextCursor.
   */
  async list(limit: number, cursor?: CursorPayload): Promise<UserSafe[]> {
    const baseConditions = [isNull(users.deletedAt)];

    if (cursor) {
      const cursorCondition = or(
        lt(users.createdAt, cursor.createdAt),
        and(eq(users.createdAt, cursor.createdAt), lt(users.id, cursor.id)),
      );
      if (cursorCondition) {
        baseConditions.push(cursorCondition);
      }
    }

    return db
      .select(userSafeColumns)
      .from(users)
      .where(and(...baseConditions))
      .orderBy(desc(users.createdAt), desc(users.id))
      .limit(limit + 1);
  }
}

export const usersRepository = new UsersRepository();
