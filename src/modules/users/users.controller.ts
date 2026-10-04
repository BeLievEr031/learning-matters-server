import type { Request, Response, NextFunction } from 'express';
import { usersService } from './users.service.js';
import type { CreateUserInput, UpdateUserInput, ListUsersQuery } from './users.schemas.js';

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

  getUserById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await this.service.getUserById(req.params.id as string);
      res.status(200).json({ data: user });
    } catch (err) {
      next(err);
    }
  };

  updateUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await this.service.updateUser(
        req.params.id as string,
        req.body as UpdateUserInput,
      );
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
