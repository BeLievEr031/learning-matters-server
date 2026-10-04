import { Router, type Request, type Response } from 'express';
import { pool } from '../../db/pool.js';
import { logger } from '../../lib/logger.js';

export const healthRouter: Router = Router();

/**
 * Liveness probe: responds 200 as long as the Node.js process is running.
 */
healthRouter.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

/**
 * Readiness probe: checks if PostgreSQL can execute queries.
 * Returns 200 when ready, 503 if the database is unreachable.
 */
healthRouter.get('/ready', async (_req: Request, res: Response) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).json({
      status: 'ready',
      db: 'up',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.error({ err }, 'Readiness probe failed: database is down');
    res.status(503).json({
      status: 'unhealthy',
      db: 'down',
      error: err instanceof Error ? err.message : 'Database unreachable',
      timestamp: new Date().toISOString(),
    });
  }
});
