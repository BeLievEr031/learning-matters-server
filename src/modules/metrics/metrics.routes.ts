import { Router, type Request, type Response, type NextFunction } from 'express';
import { env } from '../../config/env.js';
import { register, updatePoolMetrics } from '../../lib/metrics.js';
import { UnauthorizedError, ForbiddenError } from '../../lib/app-error.js';

export const metricsRouter: Router = Router();

/**
 * Middleware ensuring /metrics is accessed only with valid authorization or token.
 */
function protectMetrics(req: Request, _res: Response, next: NextFunction): void {
  const token = env.METRICS_TOKEN;

  // In production or whenever METRICS_TOKEN is set, enforce token protection
  if (token) {
    const authHeader = req.headers.authorization;
    const xMetricsToken = req.headers['x-metrics-token'];

    const matchesBearer = authHeader === `Bearer ${token}`;
    const matchesHeader = xMetricsToken === token;

    if (!matchesBearer && !matchesHeader) {
      throw new UnauthorizedError('Unauthorized access to metrics');
    }
  } else if (env.NODE_ENV === 'production') {
    // In production without METRICS_TOKEN configured, reject external public access
    throw new ForbiddenError('Metrics endpoint is not publicly accessible in production');
  }

  next();
}

metricsRouter.get(
  '/metrics',
  protectMetrics,
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      updatePoolMetrics();
      res.setHeader('Content-Type', register.contentType);
      const metricsData = await register.metrics();
      res.send(metricsData);
    } catch (err) {
      next(err);
    }
  },
);
