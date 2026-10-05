import type { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service.js';
import type { RegisterInput, LoginInput, RefreshInput, LogoutInput } from './auth.schemas.js';
import { NotFoundError, UnauthorizedError } from '../../lib/app-error.js';

export class AuthController {
  constructor(private readonly service = authService) {}

  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userAgent =
        typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined;
      const result = await this.service.register(req.body as RegisterInput, userAgent, req.ip);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userAgent =
        typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined;
      const result = await this.service.login(req.body as LoginInput, userAgent, req.ip);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userAgent =
        typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined;
      const body = req.body as RefreshInput;
      const tokens = await this.service.refresh(body.refreshToken, userAgent, req.ip);
      res.status(200).json({ tokens });
    } catch (err) {
      next(err);
    }
  };

  logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = req.body as LogoutInput;
      await this.service.logout(body.refreshToken);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };

  logoutAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (req.user) {
        await this.service.logoutAll(req.user.id);
      }
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };

  me = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }
      const user = await this.service.getMe(req.user.id);
      if (!user) {
        throw new NotFoundError('User not found');
      }
      res.status(200).json({ user });
    } catch (err) {
      next(err);
    }
  };
}

export const authController = new AuthController();
