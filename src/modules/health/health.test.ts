import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.js';
import { pool } from '../../db/pool.js';

describe('Health Module', () => {
  it('GET /health returns 200 and liveness data', async () => {
    const app = createApp();
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    const body = res.body as { status: string; uptime: number };
    expect(body.status).toBe('ok');
    expect(typeof body.uptime).toBe('number');
  });

  it('GET /ready returns 200 when database query succeeds', async () => {
    const app = createApp();
    const querySpy = vi.spyOn(pool, 'query').mockImplementation(() => {
      return Promise.resolve({
        rows: [{ '?column?': 1 }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      }) as never;
    });

    const res = await request(app).get('/ready');

    expect(res.status).toBe(200);
    const body = res.body as { status: string; db: string };
    expect(body.status).toBe('ready');
    expect(body.db).toBe('up');

    querySpy.mockRestore();
  });

  it('GET /ready returns 503 when database is down/unreachable', async () => {
    const app = createApp();
    const querySpy = vi.spyOn(pool, 'query').mockImplementation(() => {
      return Promise.reject(new Error('Connection refused at localhost:5432')) as never;
    });

    const res = await request(app).get('/ready');

    expect(res.status).toBe(503);
    const body = res.body as { status: string; db: string; error: string };
    expect(body.status).toBe('unhealthy');
    expect(body.db).toBe('down');
    expect(body.error).toContain('Connection refused');

    querySpy.mockRestore();
  });
});
