import { describe, it, expect } from 'vitest';
import { users } from './schema/users.js';
import { refreshTokens } from './schema/refresh-tokens.js';
import { seedDatabase } from './seed.js';
import { env } from '../config/env.js';

describe('Database Schema & Seed', () => {
  it('defines users schema with expected columns', () => {
    expect(users.id).toBeDefined();
    expect(users.email).toBeDefined();
    expect(users.passwordHash).toBeDefined();
    expect(users.role).toBeDefined();
    expect(users.isActive).toBeDefined();
    expect(users.createdAt).toBeDefined();
    expect(users.updatedAt).toBeDefined();
    expect(users.deletedAt).toBeDefined();
  });

  it('defines refresh_tokens schema with relations and indexes', () => {
    expect(refreshTokens.id).toBeDefined();
    expect(refreshTokens.userId).toBeDefined();
    expect(refreshTokens.tokenHash).toBeDefined();
    expect(refreshTokens.familyId).toBeDefined();
    expect(refreshTokens.expiresAt).toBeDefined();
    expect(refreshTokens.revokedAt).toBeDefined();
    expect(refreshTokens.userAgent).toBeDefined();
    expect(refreshTokens.ip).toBeDefined();
  });

  it('seed refuses to run when NODE_ENV is production', async () => {
    const originalEnv = env.NODE_ENV;
    Object.defineProperty(env, 'NODE_ENV', {
      value: 'production',
      configurable: true,
    });

    await expect(seedDatabase()).rejects.toThrow('Cannot seed database in production');

    Object.defineProperty(env, 'NODE_ENV', {
      value: originalEnv,
      configurable: true,
    });
  });
});
