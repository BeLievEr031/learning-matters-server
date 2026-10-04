import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../lib/app-error.js';
import { logger } from '../lib/logger.js';
import { env } from '../config/env.js';

export interface ErrorResponsePayload {
  error: {
    code: string;
    message: string;
    details?: unknown;
    requestId: string;
  };
}

interface PostgresDatabaseError extends Error {
  code?: string;
  detail?: string;
  table?: string;
  constraint?: string;
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  const requestId =
    (req as { id?: string }).id ??
    (typeof req.headers['x-request-id'] === 'string' ? req.headers['x-request-id'] : 'unknown');

  let statusCode = 500;
  let code = 'INTERNAL_SERVER_ERROR';
  let message = 'Internal server error';
  let details: unknown = undefined;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
    details = err.details;
  } else if (err instanceof ZodError) {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Validation failed';
    details = err.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));
  } else if (typeof err === 'object' && err !== null && 'code' in err) {
    const pgErr = err as PostgresDatabaseError;
    if (pgErr.code === '23505') {
      statusCode = 409;
      code = 'CONFLICT';
      message = 'Resource already exists';
      details = pgErr.detail;
    } else if (pgErr.code === '23503') {
      statusCode = 409;
      code = 'FOREIGN_KEY_VIOLATION';
      message = 'Referenced resource conflict';
      details = pgErr.detail;
    } else if (pgErr.code === '22P02') {
      statusCode = 400;
      code = 'BAD_REQUEST';
      message = 'Invalid data input syntax';
      details = pgErr.message;
    }
  }

  // Handle generic / unexpected errors
  if (statusCode >= 500) {
    logger.error(
      {
        err,
        requestId,
        path: req.path,
        method: req.method,
      },
      'Server error occurred',
    );

    // In production, never leak internals or stacks for 500 errors
    if (env.NODE_ENV === 'production') {
      message = 'Internal server error';
      details = undefined;
    } else if (err instanceof Error) {
      message = err.message;
      details = err.stack;
    }
  } else {
    logger.warn(
      {
        err,
        requestId,
        path: req.path,
        method: req.method,
        statusCode,
        code,
      },
      'Client error occurred',
    );
  }

  const payload: ErrorResponsePayload = {
    error: {
      code,
      message,
      ...(details !== undefined && { details }),
      requestId,
    },
  };

  res.status(statusCode).json(payload);
}
