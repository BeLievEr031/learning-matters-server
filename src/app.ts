import express, { type Express } from 'express';
import { env } from './config/env.js';
import { BODY_SIZE_LIMIT, API_V1 } from './config/constants.js';
import { requestIdMiddleware, httpLoggerMiddleware } from './middleware/request-id.js';
import { helmetMiddleware, corsMiddleware, hppMiddleware } from './middleware/security.js';
import { globalRateLimiter } from './middleware/rate-limit.js';
import { notFoundHandler } from './middleware/not-found.js';
import { errorHandler } from './middleware/error-handler.js';
import { healthRouter } from './modules/health/health.routes.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { usersRouter } from './modules/users/users.routes.js';
import { schoolsRouter } from './modules/schools/schools.routes.js';
import { boardsRouter } from './modules/boards/boards.routes.js';
import { gradesRouter } from './modules/grades/grades.routes.js';
import { docsRouter } from './docs/docs.routes.js';
import { httpMetricsMiddleware } from './lib/metrics.js';
import { metricsRouter } from './modules/metrics/metrics.routes.js';

/**
 * Creates and configures the Express application.
 * Follows strict middleware ordering:
 * 1. request-id
 * 2. pino-http logger
 * 3. helmet
 * 4. cors
 * 5. hpp
 * 6. body parsers (JSON, urlencoded)
 * 7. rate limit
 * 8. application routes
 * 9. not-found handler
 * 10. global error handler
 */
export function createApp(): Express {
  const app = express();

  // Reverse proxy trust hops
  app.set('trust proxy', env.TRUST_PROXY);

  // Security hygiene: disable X-Powered-By
  app.disable('x-powered-by');

  // 1. Request ID assignment
  app.use(requestIdMiddleware);

  // 2. HTTP Request Logger & Metrics
  app.use(httpLoggerMiddleware);
  app.use(httpMetricsMiddleware);

  // 3. Security headers (Helmet)
  app.use(helmetMiddleware);

  // 4. CORS with explicit origin allowlist
  app.use(corsMiddleware);

  // 5. HTTP Parameter Pollution protection
  app.use(hppMiddleware);

  // 6. Request body parsing with strict size limits
  app.use(express.json({ limit: BODY_SIZE_LIMIT }));
  app.use(express.urlencoded({ extended: false, limit: BODY_SIZE_LIMIT }));

  // 7. Global rate limiting
  app.use(globalRateLimiter);

  // 8. Application routes
  app.use(healthRouter);
  app.use(metricsRouter);
  app.use(docsRouter);
  app.use(`${API_V1}/auth`, authRouter);
  app.use(`${API_V1}/users`, usersRouter);
  app.use(`${API_V1}/schools`, schoolsRouter);
  app.use(`${API_V1}/boards`, boardsRouter);
  app.use(`${API_V1}/grades`, gradesRouter);

  // 9. 404 handler for unmatched routes
  app.use(notFoundHandler);

  // 10. Global error handler
  app.use(errorHandler);

  return app;
}
