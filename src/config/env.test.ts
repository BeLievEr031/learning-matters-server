import { describe, it, expect } from 'vitest';
import { parseEnv } from './env.js';

describe('env configuration', () => {
  const baseValidEnv: Record<string, string> = {
    NODE_ENV: 'test',
    PORT: '4000',
    LOG_LEVEL: 'silent',
    DATABASE_URL: 'postgres://user:pass@localhost:5432/testdb',
    REDIS_URL: 'redis://localhost:6379',
    JWT_ACCESS_SECRET: 'supersecretaccesstokenthatisatleast32characters',
    JWT_REFRESH_SECRET: 'supersecretrefreshtokenthatisatleast32chars',
    JWT_ACCESS_TTL: '15m',
    JWT_REFRESH_TTL: '7d',
    CORS_ORIGINS: 'http://localhost:3000,http://localhost:5173',
    RATE_LIMIT_WINDOW_MS: '60000',
    RATE_LIMIT_MAX: '100',
    TRUST_PROXY: '0',
  };

  it('parses a valid environment successfully', () => {
    const data = parseEnv(baseValidEnv);
    expect(data.PORT).toBe(4000);
    expect(data.NODE_ENV).toBe('test');
    expect(data.CORS_ORIGINS).toEqual(['http://localhost:3000', 'http://localhost:5173']);
    expect(data.JWT_ACCESS_TTL).toBe('15m');
  });

  it('fails when JWT_ACCESS_SECRET is too short (< 32 chars)', () => {
    expect(() =>
      parseEnv({
        ...baseValidEnv,
        JWT_ACCESS_SECRET: 'too-short-secret',
      }),
    ).toThrow(/JWT_ACCESS_SECRET/);
  });

  it('fails when DATABASE_URL is missing', () => {
    const invalidEnv = { ...baseValidEnv };
    delete invalidEnv.DATABASE_URL;
    expect(() => parseEnv(invalidEnv)).toThrow(/DATABASE_URL/);
  });

  it('fails when REDIS_URL is invalid URL', () => {
    expect(() =>
      parseEnv({
        ...baseValidEnv,
        REDIS_URL: 'not-a-url',
      }),
    ).toThrow(/REDIS_URL/);
  });

  it('applies default values for optional settings', () => {
    const minimalEnv = {
      DATABASE_URL: 'postgres://user:pass@localhost:5432/testdb',
      REDIS_URL: 'redis://localhost:6379',
      JWT_ACCESS_SECRET: 'supersecretaccesstokenthatisatleast32characters',
      JWT_REFRESH_SECRET: 'supersecretrefreshtokenthatisatleast32chars',
    };
    const data = parseEnv(minimalEnv);
    expect(data.PORT).toBe(3000);
    expect(data.NODE_ENV).toBe('development');
    expect(data.LOG_LEVEL).toBe('info');
    expect(data.RATE_LIMIT_MAX).toBe(100);
  });
});
