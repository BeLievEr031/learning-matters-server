import { describe, it, expect, vi } from 'vitest';
import { redis, createRedisClient, checkRedisHealth } from './redis.js';

describe('Redis Client & Health', () => {
  it('instantiates redis client with test options', () => {
    const client = createRedisClient();
    expect(client).toBeDefined();
    // disconnect the created client to prevent hanging connections
    client.disconnect();
  });

  describe('checkRedisHealth', () => {
    it('returns true when redis ping succeeds', async () => {
      vi.spyOn(redis, 'ping').mockResolvedValue('PONG');
      const healthy = await checkRedisHealth();
      expect(healthy).toBe(true);
    });

    it('returns false when redis ping rejects', async () => {
      vi.spyOn(redis, 'ping').mockRejectedValue(new Error('Connection refused'));
      const healthy = await checkRedisHealth();
      expect(healthy).toBe(false);
    });
  });
});
