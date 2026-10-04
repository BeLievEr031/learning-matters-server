import { Queue, Worker, type QueueOptions, type WorkerOptions, type Processor } from 'bullmq';
import { redis } from '../lib/redis.js';
import { logger } from '../lib/logger.js';
import { registerCleanupTask } from '../lib/cleanup.js';

const queues: Queue[] = [];
const workers: Worker[] = [];

/**
 * Creates a configured BullMQ Queue with exponential backoff and automatic cleanup.
 */
export function createQueue<T>(name: string, options?: Partial<QueueOptions>): Queue<T> {
  const queue = new Queue<T>(name, {
    connection: redis,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
      removeOnComplete: {
        count: 1000,
      },
      removeOnFail: {
        count: 5000,
      },
    },
    ...options,
  });

  queues.push(queue as Queue);
  return queue;
}

/**
 * Creates a BullMQ Worker with structured logging (with job ID) and dead-letter handling.
 */
export function createWorker<T>(
  name: string,
  processor: Processor<T>,
  options?: Partial<WorkerOptions>,
): Worker<T> {
  const worker = new Worker<T>(name, processor, {
    connection: redis,
    concurrency: 5,
    ...options,
  });

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id, queue: name }, 'Job completed successfully');
  });

  worker.on('failed', (job, err) => {
    const attemptsMade = job?.attemptsMade ?? 0;
    const maxAttempts = job?.opts.attempts ?? 3;

    if (attemptsMade >= maxAttempts) {
      // Dead-letter strategy: exhausted retries logged as Dead Letter
      logger.error(
        {
          jobId: job?.id,
          queue: name,
          attemptsMade,
          maxAttempts,
          err,
        },
        'Job exhausted all retry attempts. Moved to Dead Letter status.',
      );
    } else {
      logger.warn(
        {
          jobId: job?.id,
          queue: name,
          attemptsMade,
          maxAttempts,
          err,
        },
        'Job execution failed, will retry with exponential backoff',
      );
    }
  });

  worker.on('error', (err) => {
    logger.error({ queue: name, err }, 'Worker encountered internal error');
  });

  workers.push(worker as Worker);
  return worker;
}

/**
 * Gracefully closes all registered workers and queues.
 */
export async function closeAllQueuesAndWorkers(): Promise<void> {
  await Promise.all([...workers.map((w) => w.close()), ...queues.map((q) => q.close())]);
}

registerCleanupTask('bullmq-queues-and-workers', closeAllQueuesAndWorkers);
