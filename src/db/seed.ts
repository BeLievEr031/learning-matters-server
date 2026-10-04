import { fileURLToPath } from 'node:url';
import argon2 from 'argon2';
import { env } from '../config/env.js';
import { db, pool } from './pool.js';
import { users } from './schema/users.js';
import { logger } from '../lib/logger.js';
import { ARGON2_MEMORY_COST, ARGON2_TIME_COST, ARGON2_PARALLELISM } from '../config/constants.js';

export async function seedDatabase(): Promise<void> {
  if (env.NODE_ENV === 'production') {
    logger.error('Refusing to seed database in production environment');
    throw new Error('Cannot seed database in production');
  }

  logger.info('Seeding development database...');

  const defaultPassword = 'Password123!@#';
  const passwordHash = await argon2.hash(defaultPassword, {
    memoryCost: ARGON2_MEMORY_COST,
    timeCost: ARGON2_TIME_COST,
    parallelism: ARGON2_PARALLELISM,
  });

  // Seed Admin user
  await db
    .insert(users)
    .values({
      email: 'admin@learning-matters.com',
      passwordHash,
      role: 'admin',
      isActive: true,
    })
    .onConflictDoNothing({ target: users.email });

  // Seed Regular user
  await db
    .insert(users)
    .values({
      email: 'user@learning-matters.com',
      passwordHash,
      role: 'user',
      isActive: true,
    })
    .onConflictDoNothing({ target: users.email });

  logger.info('Database seeding completed successfully');
}

const currentFilePath = fileURLToPath(import.meta.url);

if (process.argv[1]?.toLowerCase() === currentFilePath.toLowerCase()) {
  seedDatabase()
    .then(async () => {
      await pool.end();
      process.exit(0);
    })
    .catch(async (err: unknown) => {
      logger.fatal({ err }, 'Seed execution failed');
      await pool.end();
      process.exit(1);
    });
}
