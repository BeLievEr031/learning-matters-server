import client, { Registry, Histogram, Counter, Gauge, collectDefaultMetrics } from 'prom-client';
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { pool } from '../db/pool.js';

export const register = new Registry();

// Collect Node.js process and runtime default metrics (memory, CPU, GC, event loop)
collectDefaultMetrics({ register, prefix: 'learning_matters_' });

// ---------------------------------------------------------------------------
// HTTP Metrics
// ---------------------------------------------------------------------------
export const httpRequestDurationHistogram = new Histogram({
  name: 'learning_matters_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
});

export const httpRequestsTotalCounter = new Counter({
  name: 'learning_matters_http_requests_total',
  help: 'Total number of HTTP requests handled',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

// ---------------------------------------------------------------------------
// Database Pool Metrics
// ---------------------------------------------------------------------------
export const dbPoolTotalGauge = new Gauge({
  name: 'learning_matters_db_pool_total_connections',
  help: 'Total PostgreSQL pool connections',
  registers: [register],
});

export const dbPoolIdleGauge = new Gauge({
  name: 'learning_matters_db_pool_idle_connections',
  help: 'Idle PostgreSQL connections in pool',
  registers: [register],
});

export const dbPoolWaitingGauge = new Gauge({
  name: 'learning_matters_db_pool_waiting_requests',
  help: 'Queued clients waiting for a connection from PostgreSQL pool',
  registers: [register],
});

// ---------------------------------------------------------------------------
// Background Job Metrics
// ---------------------------------------------------------------------------
export const jobsCompletedCounter = new Counter({
  name: 'learning_matters_jobs_completed_total',
  help: 'Total background jobs successfully processed',
  labelNames: ['queue'],
  registers: [register],
});

export const jobsFailedCounter = new Counter({
  name: 'learning_matters_jobs_failed_total',
  help: 'Total background jobs failed',
  labelNames: ['queue'],
  registers: [register],
});

export const jobDurationHistogram = new Histogram({
  name: 'learning_matters_job_duration_seconds',
  help: 'Duration of background jobs in seconds',
  labelNames: ['queue'],
  buckets: [0.05, 0.1, 0.5, 1, 2.5, 5, 10, 30, 60],
  registers: [register],
});

/**
 * Normalizes request path into a parameterized route pattern to avoid label cardinality explosion.
 */
interface ExpressRoute {
  path?: string | RegExp;
}

export function normalizeRoutePattern(req: Request): string {
  const routeObj = (req as { route?: ExpressRoute }).route;
  if (routeObj && typeof routeObj.path === 'string') {
    return `${req.baseUrl || ''}${routeObj.path}`;
  }

  // Fallback: replace UUIDs, ObjectIDs and integer identifiers with :id
  return (req.baseUrl + req.path)
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id')
    .replace(/\/\d+/g, '/:id');
}

/**
 * Updates dynamic gauge metrics from PostgreSQL connection pool before exporting.
 */
export function updatePoolMetrics(): void {
  dbPoolTotalGauge.set(pool.totalCount);
  dbPoolIdleGauge.set(pool.idleCount);
  dbPoolWaitingGauge.set(pool.waitingCount);
}

/**
 * Middleware tracking HTTP request metrics by parameterized route pattern.
 */
export const httpMetricsMiddleware: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // Exclude /metrics endpoint from tracking itself to avoid metric pollution
  if (req.path === '/metrics') {
    next();
    return;
  }

  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const end = process.hrtime.bigint();
    const durationSeconds = Number(end - start) / 1e9;
    const route = normalizeRoutePattern(req);
    const method = req.method;
    const statusCode = String(res.statusCode);

    httpRequestDurationHistogram.observe(
      { method, route, status_code: statusCode },
      durationSeconds,
    );
    httpRequestsTotalCounter.inc({ method, route, status_code: statusCode });
  });

  next();
};

export { client };
