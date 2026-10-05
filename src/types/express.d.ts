import type { UserRole } from '../db/schema/users.js';

export interface AuthenticatedUser {
  id: string;
  role: UserRole;
  schoolId: string | null;
}

declare global {
  namespace Express {
    interface Request {
      id?: string;
      user?: AuthenticatedUser;
    }
  }
}
