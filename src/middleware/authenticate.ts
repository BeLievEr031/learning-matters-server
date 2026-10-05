import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { UnauthorizedError } from '../lib/app-error.js';
import type { UserRole } from '../db/schema/users.js';

const VALID_ROLES: ReadonlySet<string> = new Set<UserRole>([
  'super_admin',
  'admin',
  'principal',
  'class_teacher',
  'teacher',
  'student',
]);

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing or malformed Authorization header');
  }

  const token = authHeader.slice(7).trim();

  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
    if (typeof decoded === 'string' || !decoded.sub) {
      throw new UnauthorizedError('Invalid access token payload');
    }

    const role: unknown = decoded.role;
    if (typeof role !== 'string' || !VALID_ROLES.has(role)) {
      throw new UnauthorizedError('Invalid access token payload');
    }

    const schoolId: unknown = decoded.schoolId;

    req.user = {
      id: decoded.sub,
      role: role as UserRole,
      schoolId: typeof schoolId === 'string' ? schoolId : null,
    };

    next();
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      throw err;
    }
    throw new UnauthorizedError('Invalid or expired access token');
  }
}
