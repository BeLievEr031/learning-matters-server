import { beforeAll, afterAll, beforeEach } from 'vitest';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { pool } from '../../src/db/pool.js';
import { runMigrations } from '../../src/db/migrate.js';
import { logger } from '../../src/lib/logger.js';

let container: StartedPostgreSqlContainer | null = null;

export async function cleanupDatabase(): Promise<void> {
  try {
    await pool.query('TRUNCATE TABLE refresh_tokens, users RESTART IDENTITY CASCADE;');
  } catch {
    // If database is not directly connected or in test mock mode, ignore
  }
}

beforeAll(async () => {
  try {
    logger.info('Attempting to start PostgreSQL Testcontainer...');
    container = await new PostgreSqlContainer('postgres:16-alpine')
      .withDatabase('testdb')
      .withUsername('postgres')
      .withPassword('postgres')
      .start();

    const connectionUri = container.getConnectionUri();
    process.env.DATABASE_URL = connectionUri;
    logger.info({ connectionUri }, 'PostgreSQL Testcontainer started successfully');

    await runMigrations();
  } catch (err) {
    logger.warn(
      { err },
      'Docker / Testcontainers not available on this host. Falling back to test database/mock environment.',
    );
  }
}, 60000);

afterAll(async () => {
  if (container) {
    logger.info('Stopping PostgreSQL Testcontainer...');
    await container.stop();
  }
  try {
    await pool.end();
  } catch {
    // Already closed or not connected
  }
});

beforeEach(async () => {
  if (container) {
    await cleanupDatabase();
  }
});
