import { rateLimit, type Options } from 'express-rate-limit';
import { RedisStore, type RedisReply } from 'rate-limit-redis';
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { env } from '../config/env.js';
import { redis } from '../lib/redis.js';
import { TooManyRequestsError } from '../lib/app-error.js';

function createRedisStore(prefix: string): RedisStore | undefined {
  if (env.NODE_ENV === 'test') {
    return undefined;
  }

  return new RedisStore({
    sendCommand: async (...args: string[]): Promise<RedisReply> => {
      const command = args[0] ?? 'PING';
      return redis.call(command, ...args.slice(1)) as Promise<RedisReply>;
    },
    prefix: `rl:${prefix}:`,
  });
}

// const globalStore = createRedisStore('global');

export const globalRateLimiter: RequestHandler = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_MAX,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  passOnStoreError: true,
  // ...(globalStore && { store: globalStore }),
  handler: (_req: Request, _res: Response, next: NextFunction) => {
    next(new TooManyRequestsError('Too many requests from this IP, please try again later'));
  },
});

/**
 * Factory for stricter rate limiting on sensitive authentication routes.
 */
export function createAuthRateLimiter(options?: Partial<Options>): RequestHandler {
  const authStore = createRedisStore('auth');

  return rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 10, // 10 attempts
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    passOnStoreError: true,
    ...(authStore && { store: authStore }),
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

export interface WriteRateLimiterOptions extends Partial<Options> {
  prefix?: string;
  windowMs?: number;
  limit?: number;
}

/**
 * Factory for per-route and per-school rate limiting on write/mutation endpoints.
 * Keys on authenticated schoolId when available, falling back to userId or client IP.
 */
export function createWriteRateLimiter(options?: WriteRateLimiterOptions): RequestHandler {
  const prefix = options?.prefix ?? 'write';
  const writeStore = createRedisStore(prefix);

  return rateLimit({
    windowMs: options?.windowMs ?? 60 * 1000, // 1 minute
    limit: options?.limit ?? 60, // 60 write requests per window
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    passOnStoreError: true,
    validate: false,
    keyGenerator: (req: Request): string => {
      if (req.user?.schoolId) {
        return `school:${req.user.schoolId}`;
      }
      if (req.user?.id) {
        return `user:${req.user.id}`;
      }
      return req.ip ?? 'unknown';
    },
    ...(writeStore && { store: writeStore }),
    handler: (_req: Request, _res: Response, next: NextFunction) => {
      next(
        new TooManyRequestsError('Too many write requests, please slow down and try again later'),
      );
    },
    ...options,
  });
}

/**
 * Default per-school rate limiter applied to write endpoints.
 */
export const schoolWriteRateLimiter: RequestHandler = createWriteRateLimiter({
  prefix: 'school-write',
  windowMs: 60 * 1000,
  limit: 60,
});
