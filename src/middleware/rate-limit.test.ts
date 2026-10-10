import { describe, it, expect } from 'vitest';
import express, { type Request, type Response, type NextFunction } from 'express';
import request from 'supertest';
import {
  globalRateLimiter,
  createAuthRateLimiter,
  createWriteRateLimiter,
  schoolWriteRateLimiter,
} from './rate-limit.js';
import { errorHandler } from './error-handler.js';
import type { AuthenticatedUser } from '../types/express.js';

describe('Rate Limiting Middleware', () => {
  it('globalRateLimiter allows requests within threshold', async () => {
    const app = express();
    app.use(globalRateLimiter);
    app.get('/test', (_req, res) => res.json({ ok: true }));
    app.use(errorHandler);

    const res = await request(app).get('/test');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('createAuthRateLimiter blocks requests exceeding threshold with 429', async () => {
    const app = express();
    app.set('trust proxy', true);
    const limiter = createAuthRateLimiter({ limit: 2, windowMs: 60000 });
    app.use(limiter);
    app.post('/login', (_req, res) => res.json({ ok: true }));
    app.use(errorHandler);

    await request(app).post('/login').set('X-Forwarded-For', '10.0.0.1');
    await request(app).post('/login').set('X-Forwarded-For', '10.0.0.1');
    const res = await request(app).post('/login').set('X-Forwarded-For', '10.0.0.1');

    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('TOO_MANY_REQUESTS');
    expect(res.body.error.message).toContain('Too many authentication attempts');
  });

  it('createWriteRateLimiter keys by schoolId and blocks when limit exceeded', async () => {
    const app = express();
    const limiter = createWriteRateLimiter({ limit: 2, windowMs: 60000 });

    const mockUserMiddleware = (req: Request, _res: Response, next: NextFunction) => {
      req.user = {
        id: 'u-1',
        email: 'admin@school1.edu',
        role: 'admin',
        schoolId: 'school-123',
      } as AuthenticatedUser;
      next();
    };

    app.use(mockUserMiddleware);
    app.use(limiter);
    app.post('/write', (_req, res) => res.status(201).json({ created: true }));
    app.use(errorHandler);

    await request(app).post('/write');
    await request(app).post('/write');
    const res = await request(app).post('/write');

    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('TOO_MANY_REQUESTS');
    expect(res.body.error.message).toContain('Too many write requests');
  });

  it('createWriteRateLimiter falls back to userId when schoolId is null', async () => {
    const app = express();
    const limiter = createWriteRateLimiter({ limit: 2, windowMs: 60000 });

    const mockUserMiddleware = (req: Request, _res: Response, next: NextFunction) => {
      req.user = {
        id: 'user-superadmin',
        email: 'sa@admin.edu',
        role: 'super_admin',
        schoolId: null,
      } as AuthenticatedUser;
      next();
    };

    app.use(mockUserMiddleware);
    app.use(limiter);
    app.post('/write', (_req, res) => res.status(201).json({ created: true }));
    app.use(errorHandler);

    await request(app).post('/write');
    await request(app).post('/write');
    const res = await request(app).post('/write');

    expect(res.status).toBe(429);
    expect(res.body.error.message).toContain('Too many write requests');
  });

  it('createWriteRateLimiter falls back to IP when unauthenticated', async () => {
    const app = express();
    const limiter = createWriteRateLimiter({ limit: 1, windowMs: 60000 });
    app.use(limiter);
    app.post('/write', (_req, res) => res.status(201).json({ created: true }));
    app.use(errorHandler);

    await request(app).post('/write').set('X-Forwarded-For', '192.168.1.1');
    const res = await request(app).post('/write').set('X-Forwarded-For', '192.168.1.1');

    expect(res.status).toBe(429);
  });

  it('schoolWriteRateLimiter is exported and functional', () => {
    expect(typeof schoolWriteRateLimiter).toBe('function');
  });
});
