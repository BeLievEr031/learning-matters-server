import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.js';
import { env } from '../../config/env.js';
import * as sentryModule from '../../lib/sentry.js';
import { normalizeRoutePattern } from '../../lib/metrics.js';
import { usersRepository } from '../users/users.repository.js';
import type { Request } from 'express';

describe('Observability: Prometheus Metrics & Sentry', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Route Pattern Normalization', () => {
    it('normalizes UUIDs in path to :id to prevent high cardinality', () => {
      const mockReq = {
        baseUrl: '/api/v1',
        path: '/users/11111111-2222-3333-4444-555555555555',
      } as Request;

      expect(normalizeRoutePattern(mockReq)).toBe('/api/v1/users/:id');
    });

    it('uses express route.path when available', () => {
      const mockReq = {
        baseUrl: '/api/v1/users',
        route: { path: '/:id' },
      } as Request;

      expect(normalizeRoutePattern(mockReq)).toBe('/api/v1/users/:id');
    });
  });

  describe('GET /metrics Endpoint & Protection', () => {
    it('serves Prometheus metrics including db pool and http counters', async () => {
      const app = createApp();
      const res = await request(app).get('/metrics');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/plain');
      expect(res.text).toContain('learning_matters_http_requests_total');
      expect(res.text).toContain('learning_matters_db_pool_total_connections');
    });

    it('enforces token protection when METRICS_TOKEN is configured', async () => {
      // Stub METRICS_TOKEN
      const originalToken = env.METRICS_TOKEN;
      (env as { METRICS_TOKEN?: string | undefined }).METRICS_TOKEN = 'secret-metrics-token-123';

      const app = createApp();

      // Case 1: Unauthorized without token
      const resUnauthorized = await request(app).get('/metrics');
      expect(resUnauthorized.status).toBe(401);

      // Case 2: Authorized with Bearer header
      const resBearer = await request(app)
        .get('/metrics')
        .set('Authorization', 'Bearer secret-metrics-token-123');
      expect(resBearer.status).toBe(200);

      // Case 3: Authorized with x-metrics-token header
      const resHeader = await request(app)
        .get('/metrics')
        .set('x-metrics-token', 'secret-metrics-token-123');
      expect(resHeader.status).toBe(200);

      (env as { METRICS_TOKEN?: string | undefined }).METRICS_TOKEN = originalToken;
    });
  });

  describe('Sentry Error Tracking', () => {
    it('captures 500 server errors in Sentry', async () => {
      const captureSpy = vi.spyOn(sentryModule, 'captureException');
      const app = createApp();

      // Simulate unexpected internal server error in service layer
      vi.spyOn(usersRepository, 'findByEmail').mockRejectedValue(
        new Error('Forced 500 test server failure'),
      );

      const res = await request(app).post('/api/v1/users').send({
        email: 'test@learning-matters.com',
        password: 'Password123!',
      });

      expect(res.status).toBe(500);
      expect(captureSpy).toHaveBeenCalledTimes(1);
    });

    it('does NOT capture 4xx client errors in Sentry', async () => {
      const captureSpy = vi.spyOn(sentryModule, 'captureException');
      const app = createApp();

      const res = await request(app).get('/api/v1/unmatched-404-route');
      expect(res.status).toBe(404);
      expect(captureSpy).not.toHaveBeenCalled();
    });
  });
});
