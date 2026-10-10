import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express, { type Express } from 'express';
import { z } from 'zod';
import {
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  TooManyRequestsError,
} from '../lib/app-error.js';
import { errorHandler, type ErrorResponsePayload } from './error-handler.js';
import { notFoundHandler } from './not-found.js';
import { createApp } from '../app.js';

function createTestAppWithRoutes(): Express {
  const app = express();
  app.use(express.json());

  app.get('/test-bad-request', () => {
    throw new BadRequestError('Invalid user input', { field: 'username' });
  });

  app.get('/test-unauthorized', () => {
    throw new UnauthorizedError('Token expired');
  });

  app.get('/test-forbidden', () => {
    throw new ForbiddenError('Insufficient permissions');
  });

  app.get('/test-not-found', () => {
    throw new NotFoundError('Item not found');
  });

  app.get('/test-conflict', () => {
    throw new ConflictError('Email already registered');
  });

  app.get('/test-too-many-requests', () => {
    throw new TooManyRequestsError('Rate limit exceeded');
  });

  app.get('/test-zod-error', () => {
    const schema = z.object({ email: z.email() });
    schema.parse({ email: 'not-an-email' });
  });

  app.get('/test-pg-unique', () => {
    const err = new Error('duplicate key value') as Error & {
      code: string;
      detail: string;
    };
    err.code = '23505';
    err.detail = 'Key (email)=(test@example.com) already exists.';
    throw err;
  });

  app.get('/test-pg-foreign-key', () => {
    const err = new Error('violates foreign key constraint') as Error & {
      code: string;
      detail: string;
    };
    err.code = '23503';
    err.detail = 'Key (user_id)=(999) is not present in table "users".';
    throw err;
  });

  app.get('/test-pg-invalid-text', () => {
    const err = new Error('invalid input syntax for type uuid') as Error & {
      code: string;
    };
    err.code = '22P02';
    throw err;
  });

  app.get('/test-unhandled', () => {
    throw new Error('Database connection crashed');
  });

  app.get('/test-unhandled-authenticated', (req) => {
    req.user = {
      id: 'usr-999',
      role: 'admin',
      schoolId: 'sch-888',
    };
    throw new Error('Database connection crashed for school admin');
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

describe('Error Handling Middleware', () => {
  const testApp = createTestAppWithRoutes();

  it('handles 404 unmatched route on createApp() in standard shape', async () => {
    const app = createApp();
    const res = await request(app).get('/non-existent-endpoint').set('x-request-id', 'req-1234');

    expect(res.status).toBe(404);
    expect(res.body as ErrorResponsePayload).toEqual({
      error: {
        code: 'NOT_FOUND',
        message: 'Route GET /non-existent-endpoint not found',
        requestId: 'req-1234',
      },
    });
  });

  it('maps BadRequestError to 400 with details', async () => {
    const res = await request(testApp).get('/test-bad-request').set('x-request-id', 'req-bad');

    expect(res.status).toBe(400);
    expect(res.body as ErrorResponsePayload).toEqual({
      error: {
        code: 'BAD_REQUEST',
        message: 'Invalid user input',
        details: { field: 'username' },
        requestId: 'req-bad',
      },
    });
  });

  it('maps UnauthorizedError to 401', async () => {
    const res = await request(testApp).get('/test-unauthorized');
    const body = res.body as ErrorResponsePayload;
    expect(res.status).toBe(401);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('maps ForbiddenError to 403', async () => {
    const res = await request(testApp).get('/test-forbidden');
    const body = res.body as ErrorResponsePayload;
    expect(res.status).toBe(403);
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('maps ConflictError to 409', async () => {
    const res = await request(testApp).get('/test-conflict');
    const body = res.body as ErrorResponsePayload;
    expect(res.status).toBe(409);
    expect(body.error.code).toBe('CONFLICT');
  });

  it('maps TooManyRequestsError to 429', async () => {
    const res = await request(testApp).get('/test-too-many-requests');
    const body = res.body as ErrorResponsePayload;
    expect(res.status).toBe(429);
    expect(body.error.code).toBe('TOO_MANY_REQUESTS');
  });

  it('maps ZodError to 400 with VALIDATION_ERROR and path details', async () => {
    const res = await request(testApp).get('/test-zod-error');
    const body = res.body as ErrorResponsePayload;
    expect(res.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(Array.isArray(body.error.details)).toBe(true);
  });

  it('maps PostgreSQL unique violation (23505) to 409 CONFLICT', async () => {
    const res = await request(testApp).get('/test-pg-unique');
    const body = res.body as ErrorResponsePayload;
    expect(res.status).toBe(409);
    expect(body.error.code).toBe('CONFLICT');
    expect(body.error.message).toBe('Resource already exists');
  });

  it('maps PostgreSQL foreign key violation (23503) to 409 FOREIGN_KEY_VIOLATION', async () => {
    const res = await request(testApp).get('/test-pg-foreign-key');
    const body = res.body as ErrorResponsePayload;
    expect(res.status).toBe(409);
    expect(body.error.code).toBe('FOREIGN_KEY_VIOLATION');
  });

  it('maps PostgreSQL invalid text (22P02) to 400 BAD_REQUEST', async () => {
    const res = await request(testApp).get('/test-pg-invalid-text');
    const body = res.body as ErrorResponsePayload;
    expect(res.status).toBe(400);
    expect(body.error.code).toBe('BAD_REQUEST');
  });

  it('maps generic unhandled error to 500 standard error shape', async () => {
    const res = await request(testApp).get('/test-unhandled');
    const body = res.body as ErrorResponsePayload;
    expect(res.status).toBe(500);
    expect(body.error.code).toBe('INTERNAL_SERVER_ERROR');
    expect(body.error.requestId).toBeDefined();
  });

  it('maps unhandled error for authenticated request to 500 with requestId', async () => {
    const res = await request(testApp).get('/test-unhandled-authenticated');
    const body = res.body as ErrorResponsePayload;
    expect(res.status).toBe(500);
    expect(body.error.code).toBe('INTERNAL_SERVER_ERROR');
    expect(body.error.requestId).toBeDefined();
  });
});
