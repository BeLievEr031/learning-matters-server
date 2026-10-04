import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import { z } from 'zod';
import { createApp } from '../app.js';
import { validate } from './validate.js';
import { createAuthRateLimiter } from './rate-limit.js';
import { errorHandler, type ErrorResponsePayload } from './error-handler.js';
import { notFoundHandler } from './not-found.js';

describe('HTTP Middleware Stack', () => {
  it('includes x-request-id on every response', async () => {
    const app = createApp();
    const res = await request(app).get('/any-endpoint');

    expect(res.headers['x-request-id']).toBeDefined();
    expect(typeof res.headers['x-request-id']).toBe('string');
  });

  it('preserves an incoming valid x-request-id', async () => {
    const app = createApp();
    const customId = 'custom-request-uuid-12345';
    const res = await request(app).get('/any-endpoint').set('x-request-id', customId);

    expect(res.headers['x-request-id']).toBe(customId);
  });

  it('rejects disallowed CORS origins with standard error shape', async () => {
    const app = createApp();
    const res = await request(app).get('/any-endpoint').set('Origin', 'https://malicious-site.com');

    expect(res.status).toBe(403);
    const body = res.body as ErrorResponsePayload;
    expect(body.error.code).toBe('FORBIDDEN');
    expect(body.error.message).toContain('not allowed by CORS');
  });

  it('allows allowed CORS origins from env', async () => {
    const app = createApp();
    const res = await request(app).get('/any-endpoint').set('Origin', 'http://localhost:3000');

    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3000');
  });

  it('rate limiter returns 429 in standard error shape when limit exceeded', async () => {
    const app = express();
    const strictLimiter = createAuthRateLimiter({
      limit: 2,
      windowMs: 60 * 1000,
    });

    app.get('/limited-route', strictLimiter, (_req, res) => {
      res.json({ ok: true });
    });
    app.use(errorHandler);

    // Request 1: OK
    const res1 = await request(app).get('/limited-route');
    expect(res1.status).toBe(200);

    // Request 2: OK
    const res2 = await request(app).get('/limited-route');
    expect(res2.status).toBe(200);

    // Request 3: 429 Too Many Requests
    const res3 = await request(app).get('/limited-route');
    expect(res3.status).toBe(429);
    const body = res3.body as ErrorResponsePayload;
    expect(body.error.code).toBe('TOO_MANY_REQUESTS');
  });

  it('validates request body and returns 400 with field details on invalid payload', async () => {
    const app = express();
    app.use(express.json());

    const bodySchema = z.object({
      email: z.email(),
      age: z.number().int().min(18),
    });

    app.post('/test-validation', validate({ body: bodySchema }), (req, res) => {
      const data = req.body as Record<string, unknown>;
      res.json({ received: data });
    });

    app.use(notFoundHandler);
    app.use(errorHandler);

    // Invalid body
    const invalidRes = await request(app)
      .post('/test-validation')
      .send({ email: 'not-an-email', age: 12 });

    expect(invalidRes.status).toBe(400);
    const body = invalidRes.body as ErrorResponsePayload;
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(Array.isArray(body.error.details)).toBe(true);

    // Valid body
    const validRes = await request(app)
      .post('/test-validation')
      .send({ email: 'valid@example.com', age: 25 });

    expect(validRes.status).toBe(200);
    expect(validRes.body).toEqual({
      received: { email: 'valid@example.com', age: 25 },
    });
  });
});
