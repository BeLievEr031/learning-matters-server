import { logger } from './lib/logger.js';
import { createWorker, closeAllQueuesAndWorkers } from './jobs/queue.factory.js';
import { EMAIL_QUEUE_NAME, processEmailJob, type EmailJobData } from './jobs/email.queue.js';

logger.info('Starting Learning Matters background worker process...');

// Register queue processors
createWorker<EmailJobData>(EMAIL_QUEUE_NAME, processEmailJob);

logger.info({ queue: EMAIL_QUEUE_NAME }, 'Worker initialized and listening for jobs');

let isShuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info({ signal }, 'Worker received shutdown signal. Closing workers gracefully...');
  try {
    await closeAllQueuesAndWorkers();
    logger.info('All worker queues and connections closed. Exiting process.');
    process.exit(0);
  } catch (err) {
    logger.error({ err }, 'Error during worker shutdown');
    process.exit(1);
  }
}

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});
