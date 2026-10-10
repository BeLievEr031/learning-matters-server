import { describe, it, expect, vi, beforeEach } from 'vitest';
import { auditLogsRepository } from './audit-logs.repository.js';
import { db } from '../../db/pool.js';
import type { AuditLog } from '../../db/schema/audit-logs.js';

describe('AuditLogsRepository', () => {
  const mockAuditLog: AuditLog = {
    id: '11111111-1111-4111-8111-111111111111',
    actorId: '22222222-2222-4222-8222-222222222222',
    actorRole: 'admin',
    schoolId: '33333333-3333-4333-8333-333333333333',
    action: 'CREATE',
    resourceType: 'school',
    resourceId: '33333333-3333-4333-8333-333333333333',
    diff: { name: 'Alpha Academy' },
    ip: '127.0.0.1',
    userAgent: 'vitest-agent',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('create', () => {
    it('creates and returns audit log record', async () => {
      vi.spyOn(db, 'insert').mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockAuditLog]),
        }),
      } as never);

      const result = await auditLogsRepository.create({
        actorId: mockAuditLog.actorId,
        actorRole: mockAuditLog.actorRole,
        schoolId: mockAuditLog.schoolId,
        action: mockAuditLog.action,
        resourceType: mockAuditLog.resourceType,
        resourceId: mockAuditLog.resourceId,
        diff: mockAuditLog.diff,
        ip: mockAuditLog.ip,
        userAgent: mockAuditLog.userAgent,
      });

      expect(result).toEqual(mockAuditLog);
    });
  });

  describe('findById', () => {
    it('returns audit log by id when found', async () => {
      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockAuditLog]),
          }),
        }),
      } as never);

      const result = await auditLogsRepository.findById(mockAuditLog.id);
      expect(result).toEqual(mockAuditLog);
    });

    it('returns null when audit log not found', async () => {
      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as never);

      const result = await auditLogsRepository.findById('00000000-0000-0000-0000-000000000000');
      expect(result).toBeNull();
    });
  });

  describe('listBySchool', () => {
    it('returns audit logs scoped to school', async () => {
      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockAuditLog]),
            }),
          }),
        }),
      } as never);

      const result = await auditLogsRepository.listBySchool('33333333-3333-4333-8333-333333333333');
      expect(result).toEqual([mockAuditLog]);
    });
  });

  describe('listByActor', () => {
    it('returns audit logs created by actor', async () => {
      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockAuditLog]),
            }),
          }),
        }),
      } as never);

      const result = await auditLogsRepository.listByActor('22222222-2222-4222-8222-222222222222');
      expect(result).toEqual([mockAuditLog]);
    });
  });

  describe('list', () => {
    it('returns list of audit logs', async () => {
      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockAuditLog]),
          }),
        }),
      } as never);

      const result = await auditLogsRepository.list();
      expect(result).toEqual([mockAuditLog]);
    });
  });
});
