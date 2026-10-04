import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { registerCleanupTask } from '../lib/cleanup.js';

const { Pool } = pg;

const isProd = env.NODE_ENV === 'production';
const isLocalhost =
  env.DATABASE_URL.includes('localhost') || env.DATABASE_URL.includes('127.0.0.1');

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: env.DB_POOL_MAX,
  idleTimeoutMillis: env.DB_POOL_IDLE_MS,
  connectionTimeoutMillis: env.DB_POOL_CONN_TIMEOUT_MS,
  statement_timeout: env.DB_STATEMENT_TIMEOUT_MS,
  idle_in_transaction_session_timeout: 10_000,
  ...(isProd &&
    !isLocalhost && {
      ssl: {
        rejectUnauthorized: false,
      },
    }),
});

// Pool error handling: log, do not crash process on idle client errors
pool.on('error', (err: Error) => {
  logger.error({ err }, 'Unexpected error on idle PostgreSQL client in connection pool');
});

// Register pool drain on graceful shutdown
registerCleanupTask('postgres-pool', async () => {
  logger.info('Draining PostgreSQL connection pool');
  await pool.end();
  logger.info('PostgreSQL connection pool drained');
});

export const db = drizzle({ client: pool });
export type Database = typeof db;
