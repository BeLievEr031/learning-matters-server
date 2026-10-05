import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { UnauthorizedError, ForbiddenError } from '../lib/app-error.js';
import type { UserRole } from '../db/schema/users.js';

/**
 * Middleware requiring specific roles. If no roles specified, requires any authenticated user.
 */
export function authorize(...roles: UserRole[]): RequestHandler {
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
 * Convenience shorthand — requires the user to be a super_admin.
 */
export function requireSuperAdmin(): RequestHandler {
  return authorize('super_admin');
}

/**
 * Guard that ensures a school-scoped user can only access resources
 * whose :schoolId param matches their own schoolId claim.
 * super_admin bypasses this check entirely.
 */
export function requireSchoolScope(): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    // super_admin can access any school
    if (req.user.role === 'super_admin') {
      next();
      return;
    }

    const paramSchoolId = req.params.schoolId;
    if (!paramSchoolId) {
      next();
      return;
    }

    if (req.user.schoolId !== paramSchoolId) {
      throw new ForbiddenError('Forbidden: Access to this school is not allowed');
    }

    next();
  };
}

/**
 * Helper to check if the current user is either the resource owner or an admin/super_admin.
 */
export function isOwnerOrAdmin(
  resourceOwnerId: string,
  user?: { id: string; role: UserRole },
): boolean {
  if (!user) return false;
  return user.role === 'admin' || user.role === 'super_admin' || user.id === resourceOwnerId;
}
