import pino from 'pino';
import { env } from '../config/env.js';

const isDev = env.NODE_ENV === 'development';

export const logger = pino({
  level: env.LOG_LEVEL,
  base: {
    service: 'learning-matters-server',
    env: env.NODE_ENV,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      '*.password',
      '*.token',
      '*.refreshToken',
      '*.accessToken',
      'password',
      'token',
      'refreshToken',
      'accessToken',
    ],
    censor: '[Redacted]',
  },
  ...(isDev && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    },
  }),
});

export type Logger = typeof logger;

/**
 * Creates a child logger scoped to a specific module or component.
 */
export function createChildLogger(
  name: string,
  bindings: Record<string, unknown> = {},
): pino.Logger {
  return logger.child({ module: name, ...bindings });
}
