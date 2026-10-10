import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ErrorEvent } from '@sentry/node';

const mockInit = vi.fn();
const mockCaptureException = vi.fn();
const mockSetExtras = vi.fn();
const mockSetUser = vi.fn();
const mockSetTag = vi.fn();

const mockScope = {
  setExtras: (...args: unknown[]): void => {
    mockSetExtras(...args);
  },
  setUser: (...args: unknown[]): void => {
    mockSetUser(...args);
  },
  setTag: (...args: unknown[]): void => {
    mockSetTag(...args);
  },
};

vi.mock('@sentry/node', () => ({
  init: (...args: unknown[]): void => {
    mockInit(...args);
  },
  captureException: (...args: unknown[]): void => {
    mockCaptureException(...args);
  },
  withScope: (callback: (scope: unknown) => void): void => {
    callback(mockScope);
  },
}));

import { scrubSentryEvent, initSentry, captureException } from './sentry.js';

describe('Sentry Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('scrubSentryEvent', () => {
    it('removes sensitive headers such as authorization, cookie, and x-metrics-token', () => {
      const mockEvent = {
        request: {
          headers: {
            authorization: 'Bearer secret-token',
            cookie: 'session_id=12345',
            'x-metrics-token': 'metrics-secret',
            'content-type': 'application/json',
          },
        },
      } as unknown as ErrorEvent;

      const scrubbed = scrubSentryEvent(mockEvent);
      expect(scrubbed.request?.headers?.authorization).toBeUndefined();
      expect(scrubbed.request?.headers?.cookie).toBeUndefined();
      expect(scrubbed.request?.headers?.['x-metrics-token']).toBeUndefined();
      expect(scrubbed.request?.headers?.['content-type']).toBe('application/json');
    });

    it('redacts sensitive keys in request body data', () => {
      const mockEvent = {
        request: {
          data: {
            email: 'user@example.com',
            password: 'SuperSecretPassword!',
            refreshToken: 'refresh-token-xyz',
            token: 'secret-token',
            secret: 'api-secret',
          },
        },
      } as unknown as ErrorEvent;

      const scrubbed = scrubSentryEvent(mockEvent);
      const data = scrubbed.request?.data as Record<string, unknown>;
      expect(data.email).toBe('user@example.com');
      expect(data.password).toBe('[Redacted]');
      expect(data.refreshToken).toBe('[Redacted]');
      expect(data.token).toBe('[Redacted]');
      expect(data.secret).toBe('[Redacted]');
    });

    it('handles event without request headers or data gracefully', () => {
      const mockEvent = {} as unknown as ErrorEvent;
      const scrubbed = scrubSentryEvent(mockEvent);
      expect(scrubbed).toEqual({});
    });
  });

  describe('initSentry & captureException', () => {
    it('returns false when no DSN is provided', () => {
      expect(initSentry(undefined)).toBe(false);
      expect(initSentry('')).toBe(false);
    });

    it('initializes Sentry when DSN is provided', () => {
      const initialized = initSentry('https://dummy@o0.ingest.sentry.io/0');

      expect(initialized).toBe(true);
      expect(mockInit).toHaveBeenCalled();
    });

    it('calls Sentry.captureException when initialized', () => {
      initSentry('https://dummy@o0.ingest.sentry.io/0');

      captureException(new Error('Test error'));
      expect(mockCaptureException).toHaveBeenCalledWith(expect.any(Error));

      captureException(new Error('Test error with context'), { userId: '123' });
      expect(mockSetExtras).toHaveBeenCalledWith({ userId: '123' });
      expect(mockCaptureException).toHaveBeenCalledWith(expect.any(Error));
    });

    it('enriches Sentry context with userContext and tags', () => {
      initSentry('https://dummy@o0.ingest.sentry.io/0');

      captureException(
        new Error('Unhandled failure'),
        { requestId: 'req-abc', path: '/api/v1/students' },
        { id: 'usr-1', role: 'admin', schoolId: 'sch-1' },
      );

      expect(mockSetExtras).toHaveBeenCalledWith({
        requestId: 'req-abc',
        path: '/api/v1/students',
      });
      expect(mockSetUser).toHaveBeenCalledWith({
        id: 'usr-1',
        role: 'admin',
        schoolId: 'sch-1',
      });
      expect(mockSetTag).toHaveBeenCalledWith('schoolId', 'sch-1');
      expect(mockSetTag).toHaveBeenCalledWith('userRole', 'admin');
      expect(mockCaptureException).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
