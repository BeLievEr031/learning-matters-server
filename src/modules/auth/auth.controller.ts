import type { Request, Response, NextFunction, CookieOptions } from 'express';
import { authService } from './auth.service.js';
import type { RegisterInput, LoginInput, RefreshInput, LogoutInput } from './auth.schemas.js';
import { NotFoundError, UnauthorizedError } from '../../lib/app-error.js';
import { env } from '../../config/env.js';

function parseDurationToMs(duration: string, defaultMs: number): number {
  const match = /^(\d+)([smhd])$/.exec(duration.trim());
  if (!match) return defaultMs;
  const value = parseInt(match[1] ?? '0', 10);
  const unit = match[2];
  switch (unit) {
    case 's':
      return value * 1000;
    case 'm':
      return value * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    default:
      return defaultMs;
  }
}

const ACCESS_TOKEN_MAX_AGE = parseDurationToMs(env.JWT_ACCESS_TTL, 15 * 60 * 1000);
const REFRESH_TOKEN_MAX_AGE = parseDurationToMs(env.JWT_REFRESH_TTL, 7 * 24 * 60 * 60 * 1000);

const baseCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
};

export function setAuthCookies(
  res: Response,
  tokens: { accessToken: string; refreshToken: string },
): void {
  res.cookie('accessToken', tokens.accessToken, {
    ...baseCookieOptions,
    maxAge: ACCESS_TOKEN_MAX_AGE,
  });
  res.cookie('refreshToken', tokens.refreshToken, {
    ...baseCookieOptions,
    maxAge: REFRESH_TOKEN_MAX_AGE,
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie('accessToken', { ...baseCookieOptions, maxAge: 0 });
  res.clearCookie('refreshToken', { ...baseCookieOptions, maxAge: 0 });
}

export class AuthController {
  constructor(private readonly service = authService) {}

  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userAgent =
        typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined;
      const result = await this.service.register(req.body as RegisterInput, userAgent, req.ip);
      setAuthCookies(res, result.tokens);
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
      setAuthCookies(res, result.tokens);
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
      const rawCookieToken: unknown = req.cookies.refreshToken;
      const cookieRefreshToken =
        typeof rawCookieToken === 'string' && rawCookieToken.trim().length > 0
          ? rawCookieToken.trim()
          : undefined;
      const refreshToken = cookieRefreshToken ?? body.refreshToken;

      if (!refreshToken) {
        throw new UnauthorizedError('Refresh token required');
      }

      const tokens = await this.service.refresh(refreshToken, userAgent, req.ip);
      setAuthCookies(res, tokens);
      res.status(200).json({ tokens });
    } catch (err) {
      next(err);
    }
  };

  logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = req.body as LogoutInput;
      const rawCookieToken: unknown = req.cookies.refreshToken;
      const cookieRefreshToken =
        typeof rawCookieToken === 'string' && rawCookieToken.trim().length > 0
          ? rawCookieToken.trim()
          : undefined;
      const refreshToken = cookieRefreshToken ?? body.refreshToken;

      if (refreshToken) {
        await this.service.logout(refreshToken);
      }
      clearAuthCookies(res);
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
      clearAuthCookies(res);
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
