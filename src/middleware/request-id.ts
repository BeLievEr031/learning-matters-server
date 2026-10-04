import { randomUUID } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { pinoHttp } from 'pino-http';
import { logger } from '../lib/logger.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const headerId = req.headers['x-request-id'];
  const incomingId =
    typeof headerId === 'string' && headerId.trim().length > 0 && headerId.length <= 128
      ? headerId.trim()
      : randomUUID();

  req.id = incomingId;
  res.setHeader('x-request-id', incomingId);
  next();
}

export const httpLoggerMiddleware = pinoHttp({
  logger,
  genReqId: (req) => {
    const reqWithId = req as Request;
    return typeof reqWithId.id === 'string' ? reqWithId.id : randomUUID();
  },
  autoLogging: {
    ignore: (req) => {
      const url = req.url ?? '';
      return url.startsWith('/health') || url.startsWith('/ready');
    },
  },
  customLogLevel: (_req, res, err) => {
    if (res.statusCode >= 500 || err) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
});
