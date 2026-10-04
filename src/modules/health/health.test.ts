import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.js';
import { pool } from '../../db/pool.js';
import * as redisModule from '../../lib/redis.js';

describe('Health Module', () => {
  it('GET /health returns 200 and liveness data', async () => {
    const app = createApp();
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    const body = res.body as { status: string; uptime: number };
    expect(body.status).toBe('ok');
    expect(typeof body.uptime).toBe('number');
  });

  it('GET /ready returns 200 when database and Redis are healthy', async () => {
    const app = createApp();
    const dbSpy = vi.spyOn(pool, 'query').mockResolvedValue({
      rows: [{ '?column?': 1 }],
      command: 'SELECT',
      rowCount: 1,
      oid: 0,
      fields: [],
    } as never);
    const redisSpy = vi.spyOn(redisModule, 'checkRedisHealth').mockResolvedValue(true);

    const res = await request(app).get('/ready');

    expect(res.status).toBe(200);
    const body = res.body as { status: string; db: string; redis: string };
    expect(body.status).toBe('ready');
    expect(body.db).toBe('up');
    expect(body.redis).toBe('up');

    dbSpy.mockRestore();
    redisSpy.mockRestore();
  });

  it('GET /ready returns 503 when database is down/unreachable', async () => {
    const app = createApp();
    const dbSpy = vi
      .spyOn(pool, 'query')
      .mockRejectedValue(new Error('Connection refused at localhost:5432'));
    const redisSpy = vi.spyOn(redisModule, 'checkRedisHealth').mockResolvedValue(true);

    const res = await request(app).get('/ready');

    expect(res.status).toBe(503);
    const body = res.body as { status: string; db: string; error?: string };
    expect(body.status).toBe('unhealthy');
    expect(body.db).toBe('down');
    expect(body.error).toContain('Connection refused');

    dbSpy.mockRestore();
    redisSpy.mockRestore();
  });

  it('GET /ready returns 503 when Redis is down/unreachable', async () => {
    const app = createApp();
    const dbSpy = vi.spyOn(pool, 'query').mockResolvedValue({
      rows: [{ '?column?': 1 }],
      command: 'SELECT',
      rowCount: 1,
      oid: 0,
      fields: [],
    } as never);
    const redisSpy = vi.spyOn(redisModule, 'checkRedisHealth').mockResolvedValue(false);

    const res = await request(app).get('/ready');

    expect(res.status).toBe(503);
    const body = res.body as { status: string; redis: string; error?: string };
    expect(body.status).toBe('unhealthy');
    expect(body.redis).toBe('down');
    expect(body.error).toContain('Redis ping failed');

    dbSpy.mockRestore();
    redisSpy.mockRestore();
  });
});
