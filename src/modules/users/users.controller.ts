import type { Request, Response, NextFunction } from 'express';
import { usersService } from './users.service.js';
import type { CreateUserInput, UpdateUserInput, ListUsersQuery } from './users.schemas.js';
import { isOwnerOrAdmin } from '../../middleware/authorize.js';
import { ForbiddenError, UnauthorizedError } from '../../lib/app-error.js';

export class UsersController {
  constructor(private readonly service = usersService) {}

  createUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await this.service.createUser(req.body as CreateUserInput);
      res.status(201).json({ data: user });
    } catch (err) {
      next(err);
    }
  };

  getCurrentUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }
      const user = await this.service.getUserById(req.user.id);
      res.status(200).json({ data: user });
    } catch (err) {
      next(err);
    }
  };

  updateCurrentUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }
      const user = await this.service.updateUser(
        req.user.id,
        req.body as UpdateUserInput,
        req.user.role,
      );
      res.status(200).json({ data: user });
    } catch (err) {
      next(err);
    }
  };

  getUserById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      if (req.user && !isOwnerOrAdmin(id, req.user)) {
        throw new ForbiddenError('Forbidden: Insufficient permissions');
      }
      const user = await this.service.getUserById(id);
      res.status(200).json({ data: user });
    } catch (err) {
      next(err);
    }
  };

  updateUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      if (req.user && !isOwnerOrAdmin(id, req.user)) {
        throw new ForbiddenError('Forbidden: Insufficient permissions');
      }
      const user = await this.service.updateUser(id, req.body as UpdateUserInput, req.user?.role);
      res.status(200).json({ data: user });
    } catch (err) {
      next(err);
    }
  };

  deleteUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.service.deleteUser(req.params.id as string);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };

  listUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.listUsers(req.query as unknown as ListUsersQuery);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };
}

export const usersController = new UsersController();
