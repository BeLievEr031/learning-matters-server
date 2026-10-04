import * as Sentry from '@sentry/node';
import { env } from '../config/env.js';
import { logger } from './logger.js';

let isSentryInitialized = false;

if (env.SENTRY_DSN) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    release: 'learning-matters-server@1.0.0',
    beforeSend(event) {
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
    },
  });

  isSentryInitialized = true;
  logger.info({ environment: env.NODE_ENV }, 'Sentry error tracking initialized');
}

/**
 * Captures an unhandled exception or 5xx server error to Sentry.
 */
export function captureException(err: unknown, extraContext?: Record<string, unknown>): void {
  if (isSentryInitialized) {
    if (extraContext) {
      Sentry.captureException(err, {
        extra: extraContext,
      });
    } else {
      Sentry.captureException(err);
    }
  }
}

export { Sentry, isSentryInitialized };
