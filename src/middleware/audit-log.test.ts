import { describe, it, expect, vi, beforeEach } from 'vitest';
import express, { type Request, type Response, type NextFunction } from 'express';
import request from 'supertest';
import { createAuditLogMiddleware } from './audit-log.js';
import type { AuditLogsRepository } from '../modules/audit-logs/audit-logs.repository.js';

describe('Audit Log Middleware', () => {
  const createSpy = vi.fn();
  let mockRepo: AuditLogsRepository;

  beforeEach(() => {
    vi.restoreAllMocks();
    createSpy.mockReset().mockResolvedValue({});
    mockRepo = {
      create: createSpy,
      findById: vi.fn(),
      listBySchool: vi.fn(),
      listByActor: vi.fn(),
      list: vi.fn(),
    } as unknown as AuditLogsRepository;
  });

  it('ignores GET requests (no mutation)', async () => {
    const app = express();
    app.use(createAuditLogMiddleware(mockRepo));
    app.get('/api/v1/schools', (_req, res) => res.json({ ok: true }));

    await request(app).get('/api/v1/schools');

    expect(createSpy).not.toHaveBeenCalled();
  });

  it('records successful POST mutation with redacted sensitive fields', async () => {
    const app = express();
    app.use(express.json());

    const mockUserMiddleware = (req: Request, _res: Response, next: NextFunction) => {
      req.user = {
        id: 'u-admin-1',
        role: 'admin',
        schoolId: 'school-123',
      };
      next();
    };

    app.use(mockUserMiddleware);
    app.use(createAuditLogMiddleware(mockRepo));
    app.post('/api/v1/schools', (_req, res) => res.status(201).json({ id: 's-1' }));

    await request(app)
      .post('/api/v1/schools')
      .send({ name: 'Alpha High', password: 'secretpassword123' });

    // Allow event loop cycle for res.on('finish')
    await new Promise((r) => setTimeout(r, 10));

    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'u-admin-1',
        actorRole: 'admin',
        schoolId: 'school-123',
        action: 'CREATE',
        resourceType: 'school',
        diff: {
          name: 'Alpha High',
          password: '[Redacted]',
        },
      }),
    );
  });

  it('does not record failed mutations (status >= 400)', async () => {
    const app = express();
    app.use(express.json());
    app.use(createAuditLogMiddleware(mockRepo));
    app.post('/api/v1/schools', (_req, res) => res.status(400).json({ error: 'bad input' }));

    await request(app).post('/api/v1/schools').send({ name: '' });
    await new Promise((r) => setTimeout(r, 10));

    expect(createSpy).not.toHaveBeenCalled();
  });

  it('resolves TRANSFER and ASSIGN_CLASS_TEACHER actions properly', async () => {
    const app = express();
    app.use(express.json());
    app.use(createAuditLogMiddleware(mockRepo));

    app.patch('/api/v1/students/:id/transfer', (_req, res) => res.json({ ok: true }));
    app.put('/api/v1/grades/:id/class-teacher', (_req, res) => res.json({ ok: true }));

    await request(app).patch('/api/v1/students/stu-1/transfer').send({ targetGradeId: 'g-2' });
    await request(app).put('/api/v1/grades/gr-1/class-teacher').send({ teacherId: 't-1' });

    await new Promise((r) => setTimeout(r, 10));

    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'TRANSFER',
        resourceType: 'student',
        resourceId: 'stu-1',
      }),
    );

    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'ASSIGN_CLASS_TEACHER',
        resourceType: 'grade',
        resourceId: 'gr-1',
      }),
    );
  });

  it('handles delete mutation properly', async () => {
    const app = express();
    app.use(createAuditLogMiddleware(mockRepo));
    app.delete('/api/v1/boards/:id', (_req, res) => res.status(204).end());

    await request(app).delete('/api/v1/boards/b-123');
    await new Promise((r) => setTimeout(r, 10));

    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'DELETE',
        resourceType: 'board',
        resourceId: 'b-123',
      }),
    );
  });
});
