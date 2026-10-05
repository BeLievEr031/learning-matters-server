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

  // Seed Super Admin — school-agnostic (schoolId = NULL)
  await db
    .insert(users)
    .values({
      email: 'superadmin@learning-matters.com',
      passwordHash,
      role: 'super_admin',
      schoolId: null,
      firstName: 'Super',
      lastName: 'Admin',
      status: 'active',
      isActive: true,
    })
    .onConflictDoNothing({ target: users.email });

  // Seed placeholder School Admin — schoolId will be updated once schools table exists
  await db
    .insert(users)
    .values({
      email: 'admin@learning-matters.com',
      passwordHash,
      role: 'admin',
      schoolId: null,
      firstName: 'School',
      lastName: 'Admin',
      status: 'active',
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
