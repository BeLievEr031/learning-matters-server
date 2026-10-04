import { describe, it, expect, vi } from 'vitest';
import { createQueue, createWorker } from './queue.factory.js';
import { processEmailJob, type EmailJobData } from './email.queue.js';
import { checkRedisHealth, redis } from '../lib/redis.js';
import type { Job } from 'bullmq';

describe('Background Jobs & BullMQ Worker', () => {
  it('creates queue with default retry attempts and exponential backoff', async () => {
    const testQueue = createQueue('test-retry-queue');

    expect(testQueue.name).toBe('test-retry-queue');
    expect(testQueue.defaultJobOptions.attempts).toBe(3);
    expect(testQueue.defaultJobOptions.backoff).toEqual({
      type: 'exponential',
      delay: 1000,
    });

    await testQueue.close();
  });

  it('creates worker and attaches completion, failure, and error listeners', async () => {
    const processor = vi.fn().mockResolvedValue(undefined);
    const worker = createWorker('test-worker', processor, { autorun: false });

    expect(worker.name).toBe('test-worker');
    expect(worker.listenerCount('completed')).toBeGreaterThan(0);
    expect(worker.listenerCount('failed')).toBeGreaterThan(0);
    expect(worker.listenerCount('error')).toBeGreaterThan(0);

    await worker.close();
  });

  it('processes email job without throwing', async () => {
    const mockJob = {
      id: 'job-12345',
      data: {
        to: 'user@learning-matters.com',
        subject: 'Welcome to Learning Matters',
        template: 'welcome-email',
      },
    } as unknown as Job<EmailJobData>;

    await expect(processEmailJob(mockJob)).resolves.toBeUndefined();
  });

  it('checkRedisHealth returns true when PING responds PONG', async () => {
    const pingSpy = vi.spyOn(redis, 'ping').mockResolvedValue('PONG');
    const result = await checkRedisHealth();
    expect(result).toBe(true);
    pingSpy.mockRestore();
  });

  it('checkRedisHealth returns false when PING throws or fails', async () => {
    const pingSpy = vi.spyOn(redis, 'ping').mockRejectedValue(new Error('Connection failed'));
    const result = await checkRedisHealth();
    expect(result).toBe(false);
    pingSpy.mockRestore();
  });
});
