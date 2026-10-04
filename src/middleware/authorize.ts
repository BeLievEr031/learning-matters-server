import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { UnauthorizedError, ForbiddenError } from '../lib/app-error.js';

/**
 * Middleware requiring specific roles. If no roles specified, requires any authenticated user.
 */
export function authorize(...roles: ('user' | 'admin')[]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    if (roles.length > 0 && !roles.includes(req.user.role)) {
      throw new ForbiddenError('Forbidden: Insufficient permissions');
    }

    next();
  };
}

/**
 * Helper to check if the current user is either the resource owner or an admin.
 */
export function isOwnerOrAdmin(
  resourceOwnerId: string,
  user?: { id: string; role: 'user' | 'admin' },
): boolean {
  if (!user) return false;
  return user.role === 'admin' || user.id === resourceOwnerId;
}
