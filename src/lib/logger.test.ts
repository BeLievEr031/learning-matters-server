import { describe, it, expect } from 'vitest';
import pino from 'pino';
import { createChildLogger } from './logger.js';

describe('logger', () => {
  it('redacts sensitive fields like password and token', () => {
    let loggedData = '';
    const destination = {
      write(chunk: string) {
        loggedData += chunk;
      },
    };

    const testLogger = pino(
      {
        level: 'info',
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
      },
      destination,
    );

    testLogger.info({
      password: 'super-secret-password',
      token: 'secret-token-value',
      user: { password: 'nested-secret-password' },
      email: 'user@example.com',
    });

    interface LoggedPayload {
      password?: string;
      token?: string;
      email?: string;
      user?: { password?: string };
    }

    const parsed = JSON.parse(loggedData) as LoggedPayload;
    expect(parsed.password).toBe('[Redacted]');
    expect(parsed.token).toBe('[Redacted]');
    expect(parsed.user?.password).toBe('[Redacted]');
    expect(parsed.email).toBe('user@example.com');
  });

  it('creates child logger with module binding', () => {
    const child = createChildLogger('auth-service');
    const bindings = child.bindings() as { module?: string };
    expect(bindings.module).toBe('auth-service');
  });
});
