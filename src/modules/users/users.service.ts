import argon2 from 'argon2';
import { usersRepository, type UserSafe } from './users.repository.js';
import type { CreateUserInput, UpdateUserInput, ListUsersQuery } from './users.schemas.js';
import { NotFoundError, ConflictError, ForbiddenError } from '../../lib/app-error.js';
import {
  decodeCursor,
  buildPaginatedResponse,
  type PaginatedResult,
} from '../../lib/pagination.js';
import {
  ARGON2_MEMORY_COST,
  ARGON2_TIME_COST,
  ARGON2_PARALLELISM,
} from '../../config/constants.js';

export class UsersService {
  constructor(private readonly repo = usersRepository) {}

  /**
   * Create a new user with normalized email, duplicate detection, and argon2 password hash.
   */
  async createUser(input: CreateUserInput): Promise<UserSafe> {
    const normalizedEmail = input.email.trim().toLowerCase();

    const existing = await this.repo.findByEmail(normalizedEmail);
    if (existing) {
      throw new ConflictError('User with this email already exists');
    }

    const passwordHash = await argon2.hash(input.password, {
      memoryCost: ARGON2_MEMORY_COST,
      timeCost: ARGON2_TIME_COST,
      parallelism: ARGON2_PARALLELISM,
    });

    return this.repo.create({
      email: normalizedEmail,
      passwordHash,
      role: input.role,
    });
  }

  /**
   * Retrieve a user by ID. Throws NotFoundError if not found or soft-deleted.
   */
  async getUserById(id: string): Promise<UserSafe> {
    const user = await this.repo.findById(id);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return user;
  }

  /**
   * Update an existing user. Enforces role-change restrictions and email uniqueness.
   */
  async updateUser(id: string, input: UpdateUserInput, callerRole?: string): Promise<UserSafe> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundError('User not found');
    }

    if (input.role && callerRole !== 'admin' && callerRole !== 'super_admin') {
      throw new ForbiddenError('Only administrators can change user roles');
    }

    if (input.email) {
      const normalizedEmail = input.email.trim().toLowerCase();
      if (normalizedEmail !== existing.email) {
        const emailTaken = await this.repo.findByEmail(normalizedEmail);
        if (emailTaken) {
          throw new ConflictError('Email already in use');
        }
      }
    }

    const updated = await this.repo.update(id, input);
    if (!updated) {
      throw new NotFoundError('User not found');
    }

    return updated;
  }

  /**
   * Soft-delete a user by ID.
   */
  async deleteUser(id: string): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundError('User not found');
    }

    await this.repo.softDelete(id);
  }

  /**
   * List users with cursor-based pagination.
   */
  async listUsers(query: ListUsersQuery): Promise<PaginatedResult<UserSafe>> {
    const cursor = query.cursor ? decodeCursor(query.cursor) : undefined;
    const rawItems = await this.repo.list(query.limit, cursor ?? undefined);

    return buildPaginatedResponse(rawItems, query.limit, (user) => ({
      createdAt: user.createdAt,
      id: user.id,
    }));
  }
}

export const usersService = new UsersService();
