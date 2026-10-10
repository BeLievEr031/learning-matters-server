import type { Request, Response, NextFunction, RequestHandler } from 'express';
import {
  auditLogsRepository,
  type AuditLogsRepository,
} from '../modules/audit-logs/audit-logs.repository.js';
import { logger } from '../lib/logger.js';

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const SENSITIVE_KEYS = new Set(['password', 'token', 'refreshToken', 'secret']);

function sanitizeDiff(body: unknown): Record<string, unknown> | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return null;
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(key)) {
      result[key] = '[Redacted]';
    } else {
      result[key] = value;
    }
  }

  return result;
}

const SUB_ACTIONS = new Set(['transfer', 'class-teacher']);

function extractResourceFromPath(path: string): {
  resourceType: string;
  resourceId: string | null;
} {
  // Strip /api/v1 or leading slashes
  const cleanPath = path.replace(/^\/api\/v\d+\//, '').replace(/^\//, '');
  const segments = cleanPath.split('/').filter(Boolean);

  if (segments.length === 0) {
    return { resourceType: 'unknown', resourceId: null };
  }

  let resourceType = segments[0];
  let resourceId: string | null = null;

  if (segments.length >= 2) {
    resourceId = segments[1];
  }

  // If nested sub-resource e.g. /schools/:schoolId/boards or /grades/:gradeId/subjects/:subjectId
  if (segments.length >= 3 && !SUB_ACTIONS.has(segments[2])) {
    resourceType = segments[2];
    resourceId = segments[3] ?? null;
  }

  // Normalize plural to singular (e.g. schools -> school)
  if (resourceType.endsWith('ies')) {
    resourceType = resourceType.slice(0, -3) + 'y';
  } else if (resourceType.endsWith('ses')) {
    resourceType = resourceType.slice(0, -2);
  } else if (resourceType.endsWith('s') && !resourceType.endsWith('ss')) {
    resourceType = resourceType.slice(0, -1);
  }

  return { resourceType, resourceId };
}

function resolveAction(method: string, path: string): string {
  if (method === 'DELETE') {
    return 'DELETE';
  }
  if (method === 'PUT' || method === 'PATCH') {
    if (path.includes('/transfer')) {
      return 'TRANSFER';
    }
    if (path.includes('/class-teacher')) {
      return 'ASSIGN_CLASS_TEACHER';
    }
    return 'UPDATE';
  }
  if (method === 'POST') {
    if (path.includes('/login')) {
      return 'LOGIN';
    }
    if (path.includes('/register')) {
      return 'REGISTER';
    }
    return 'CREATE';
  }
  return method;
}

export function createAuditLogMiddleware(
  repo: AuditLogsRepository = auditLogsRepository,
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!MUTATION_METHODS.has(req.method)) {
      next();
      return;
    }

    res.on('finish', () => {
      // Only record successful mutations (2xx status codes)
      if (res.statusCode < 200 || res.statusCode >= 300) {
        return;
      }

      const { resourceType, resourceId } = extractResourceFromPath(req.path);
      const action = resolveAction(req.method, req.path);
      const diff = sanitizeDiff(req.body);
      const ip = req.ip ?? null;
      const userAgent = req.headers['user-agent'] ?? null;

      // Asynchronously persist audit log
      Promise.resolve()
        .then(async () => {
          await repo.create({
            actorId: req.user?.id ?? null,
            actorRole: req.user?.role ?? null,
            schoolId: req.user?.schoolId ?? null,
            action,
            resourceType,
            resourceId,
            diff,
            ip,
            userAgent,
          });
        })
        .catch((err: unknown) => {
          logger.error({ err, path: req.path, method: req.method }, 'Failed to record audit log');
        });
    });

    next();
  };
}

export const auditLogMiddleware: RequestHandler = createAuditLogMiddleware();
