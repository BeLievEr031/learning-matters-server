import { z } from 'zod';
import * as dotenv from 'dotenv';

dotenv.config();

const commaSeparatedToArray = z
  .string()
  .default('http://localhost:3000')
  .transform((val) =>
    val
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  );

export const envSchema = z.object({
  // Runtime
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent']).default('info'),

  // Database
  DATABASE_URL: z.url({ message: 'DATABASE_URL must be a valid URL' }),
  DB_POOL_MAX: z.coerce.number().int().positive().default(10),
  DB_POOL_IDLE_MS: z.coerce.number().int().positive().default(10_000),
  DB_POOL_CONN_TIMEOUT_MS: z.coerce.number().int().positive().default(5_000),
  DB_STATEMENT_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),

  // Redis
  REDIS_URL: z.url({ message: 'REDIS_URL must be a valid URL' }),

  // JWT
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('7d'),

  // CORS
  CORS_ORIGINS: commaSeparatedToArray,

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),

  // Server
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),

  // Observability (optional)
  SENTRY_DSN: z.url().optional(),
  ENABLE_DOCS: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),
  METRICS_TOKEN: z.string().optional(),
});

export function parseEnv(rawEnv: NodeJS.ProcessEnv = process.env) {
  const result = envSchema.safeParse(rawEnv);
  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    const message = `\n❌ Invalid environment variables:\n${formatted}\n`;

    if (process.env.NODE_ENV !== 'test') {
      // eslint-disable-next-line no-console
      console.error(message);
      process.exit(1);
    }

    throw new Error(message);
  }

  if (result.data.NODE_ENV === 'test') {
    return result.data;
  }
  return Object.freeze(result.data);
}

let parsedEnv: z.infer<typeof envSchema>;
try {
  parsedEnv = parseEnv(process.env);
} catch (err) {
  if (process.env.NODE_ENV === 'test') {
    // Provide safe defaults in test mode when full env is not injected
    parsedEnv = envSchema.parse({
      NODE_ENV: 'test',
      DATABASE_URL: 'postgres://postgres:postgres@localhost:5432/test',
      REDIS_URL: 'redis://localhost:6379',
      JWT_ACCESS_SECRET: 'test-access-secret-at-least-32-chars-long',
      JWT_REFRESH_SECRET: 'test-refresh-secret-at-least-32-chars-long',
    });
  } else {
    throw err;
  }
}

export const env = parsedEnv;
export type Env = typeof env;
