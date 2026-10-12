import { Router } from 'express';
import { auditLogsController } from './audit-logs.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { listAuditLogsQuerySchema } from './audit-logs.schemas.js';

export const auditLogsRouter: Router = Router();

// List audit logs (super_admin or school admin)
auditLogsRouter.get(
  '/',
  authenticate,
  authorize('super_admin', 'admin'),
  validate({ query: listAuditLogsQuerySchema }),
  auditLogsController.listAuditLogs,
);

// Get single audit log by ID
auditLogsRouter.get(
  '/:id',
  authenticate,
  authorize('super_admin', 'admin'),
  auditLogsController.getAuditLogById,
);
