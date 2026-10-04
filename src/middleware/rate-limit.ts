import { rateLimit, type Options } from 'express-rate-limit';
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { env } from '../config/env.js';
import { TooManyRequestsError } from '../lib/app-error.js';

export const globalRateLimiter: RequestHandler = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_MAX,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req: Request, _res: Response, next: NextFunction) => {
    next(new TooManyRequestsError('Too many requests from this IP, please try again later'));
  },
});

/**
 * Factory for stricter rate limiting on sensitive authentication routes.
 */
export function createAuthRateLimiter(options?: Partial<Options>): RequestHandler {
  return rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 10, // 10 attempts
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (_req: Request, _res: Response, next: NextFunction) => {
      next(
        new TooManyRequestsError(
          'Too many authentication attempts, please try again after 15 minutes',
        ),
      );
    },
    ...options,
  });
}
