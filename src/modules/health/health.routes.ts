import { Router, type Request, type Response } from 'express';
import { pool } from '../../db/pool.js';
import { checkRedisHealth } from '../../lib/redis.js';
import { logger } from '../../lib/logger.js';

export const healthRouter: Router = Router();

/**
 * Liveness probe: responds 200 as long as the Node.js process is running.
 */
healthRouter.get(['/health', '/healthz', '/live'], (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

/**
 * Readiness probe: checks if PostgreSQL and Redis are responsive.
 * Returns 200 when ready, 503 if any dependent service is down.
 */
healthRouter.get('/ready', async (_req: Request, res: Response) => {
  let dbOk = false;
  let redisOk = false;
  let dbErr: string | undefined;
  let redisErr: string | undefined;

  try {
    await pool.query('SELECT 1');
    dbOk = true;
  } catch (err) {
    dbErr = err instanceof Error ? err.message : 'Database unreachable';
  }

  try {
    redisOk = await checkRedisHealth();
    if (!redisOk) {
      redisErr = 'Redis ping failed';
    }
  } catch (err) {
    redisErr = err instanceof Error ? err.message : 'Redis unreachable';
  }

  const isHealthy = dbOk && redisOk;
  const statusCode = isHealthy ? 200 : 503;

  if (!isHealthy) {
    logger.error({ dbErr, redisErr }, 'Readiness probe failed');
  }

  res.status(statusCode).json({
    status: isHealthy ? 'ready' : 'unhealthy',
    db: dbOk ? 'up' : 'down',
    redis: redisOk ? 'up' : 'down',
    checks: {
      database: dbOk ? 'ok' : 'error',
      redis: redisOk ? 'ok' : 'error',
    },
    ...(!isHealthy && {
      error: [dbErr, redisErr].filter(Boolean).join('; '),
    }),
    timestamp: new Date().toISOString(),
  });
});
