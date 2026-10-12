import type { Request, Response, NextFunction } from 'express';
import { auditLogsRepository } from './audit-logs.repository.js';
import type { ListAuditLogsQuery } from './audit-logs.schemas.js';

export class AuditLogsController {
  listAuditLogs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = req.query as unknown as ListAuditLogsQuery;
      const callerRole = req.user?.role;
      const callerSchoolId = req.user?.schoolId;

      // School scope constraint: admins are restricted to their schoolId
      let effectiveSchoolId = query.schoolId;
      if (callerRole !== 'super_admin') {
        effectiveSchoolId = callerSchoolId ?? undefined;
      }

      const limit = query.limit;
      const logs = await auditLogsRepository.listFiltered({
        schoolId: effectiveSchoolId,
        actorId: query.actorId,
        resourceType: query.resourceType,
        action: query.action,
        limit,
      });

      res.status(200).json({
        success: true,
        data: logs,
        meta: {
          total: logs.length,
          limit,
          hasMore: logs.length === limit,
        },
      });
    } catch (err) {
      next(err);
    }
  };

  getAuditLogById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const log = await auditLogsRepository.findById(id);
      if (!log) {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Audit log not found',
          },
        });
        return;
      }
      res.status(200).json({
        success: true,
        data: log,
      });
    } catch (err) {
      next(err);
    }
  };
}

export const auditLogsController = new AuditLogsController();
