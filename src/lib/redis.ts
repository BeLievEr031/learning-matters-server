import { Redis } from 'ioredis';
import { env } from '../config/env.js';
import { logger } from './logger.js';
import { registerCleanupTask } from './cleanup.js';

export function createRedisClient(): Redis {
  const client = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: env.NODE_ENV === 'test',
    retryStrategy(times: number) {
      if (env.NODE_ENV === 'test') {
        return null; // Do not retry in test environment
      }
      return Math.min(times * 50, 2000);
    },
  });

  client.on('error', (err: Error) => {
    logger.error({ err }, 'Unexpected Redis client error');
  });

  return client;
}

export const redis = createRedisClient();

registerCleanupTask('redis-client', async () => {
  try {
    if (redis.status === 'ready' || redis.status === 'connecting') {
      logger.info('Closing Redis connection');
      await redis.quit();
      logger.info('Redis connection closed');
    }
  } catch (err) {
    logger.warn({ err }, 'Error closing Redis connection');
  }
});

export async function checkRedisHealth(): Promise<boolean> {
  try {
    await redis.ping();
    return true;
  } catch {
    return false;
  }
}
