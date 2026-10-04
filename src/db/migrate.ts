import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db, pool } from './pool.js';
import { logger } from '../lib/logger.js';

/**
 * Runs all pending migrations in drizzle/ folder.
 */
export async function runMigrations(): Promise<void> {
  logger.info('Running database migrations...');
  try {
    await migrate(db, { migrationsFolder: 'drizzle' });
    logger.info('Database migrations completed successfully');
  } catch (err) {
    logger.error({ err }, 'Database migration failed');
    throw err;
  }
}

const currentFilePath = fileURLToPath(import.meta.url);

if (process.argv[1]?.toLowerCase() === currentFilePath.toLowerCase()) {
  runMigrations()
    .then(async () => {
      await pool.end();
      process.exit(0);
    })
    .catch(async (err: unknown) => {
      logger.fatal({ err }, 'Migration execution failed');
      await pool.end();
      process.exit(1);
    });
}
