import * as Sentry from '@sentry/node';
import { env } from '../config/env.js';
import { logger } from './logger.js';

let isSentryInitialized = false;

export function scrubSentryEvent(event: Sentry.ErrorEvent): Sentry.ErrorEvent {
  // Scrub sensitive authentication and cookie headers
  if (event.request?.headers) {
    delete event.request.headers.authorization;
    delete event.request.headers.cookie;
    delete event.request.headers['x-metrics-token'];
  }

  // Scrub request body if present
  if (event.request?.data && typeof event.request.data === 'object') {
    const sensitiveKeys = ['password', 'refreshToken', 'token', 'secret'];
    const data = { ...event.request.data } as Record<string, unknown>;
    for (const key of sensitiveKeys) {
      if (key in data) {
        data[key] = '[Redacted]';
      }
    }
    event.request.data = data;
  }

  return event;
}

export function initSentry(dsn?: string): boolean {
  if (dsn) {
    Sentry.init({
      dsn,
      environment: env.NODE_ENV,
      release: 'learning-matters-server@1.0.0',
      beforeSend: scrubSentryEvent,
    });
    isSentryInitialized = true;
    logger.info({ environment: env.NODE_ENV }, 'Sentry error tracking initialized');
    return true;
  }
  return false;
}

initSentry(env.SENTRY_DSN);

export interface SentryUserContext {
  id?: string | undefined;
  role?: string | undefined;
  schoolId?: string | null | undefined;
  [key: string]: unknown;
}

/**
 * Captures an unhandled exception or 5xx server error to Sentry.
 */
export function captureException(
  err: unknown,
  extraContext?: Record<string, unknown>,
  userContext?: SentryUserContext,
): void {
  if (isSentryInitialized) {
    Sentry.withScope((scope) => {
      if (extraContext) {
        scope.setExtras(extraContext);
      }

      if (userContext) {
        scope.setUser({
          ...(userContext.id !== undefined && { id: userContext.id }),
          ...(userContext.role !== undefined && { role: userContext.role }),
          ...(userContext.schoolId !== undefined &&
            userContext.schoolId !== null && { schoolId: userContext.schoolId }),
        });

        if (userContext.schoolId) {
          scope.setTag('schoolId', userContext.schoolId);
        }
        if (userContext.role) {
          scope.setTag('userRole', userContext.role);
        }
      }

      Sentry.captureException(err);
    });
  }
}

export { Sentry, isSentryInitialized };
