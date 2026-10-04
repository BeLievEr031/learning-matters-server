import { logger } from './logger.js';

export type CleanupHandler = () => Promise<void> | void;

interface CleanupTask {
  name: string;
  handler: CleanupHandler;
}

const cleanupTasks: CleanupTask[] = [];

/**
 * Register a cleanup task to be executed during graceful shutdown.
 */
export function registerCleanupTask(name: string, handler: CleanupHandler): void {
  cleanupTasks.push({ name, handler });
}

/**
 * Execute all registered cleanup tasks in reverse registration order (LIFO).
 */
export async function runCleanupTasks(): Promise<void> {
  logger.info({ taskCount: cleanupTasks.length }, 'Running registered cleanup tasks');

  for (const { name, handler } of [...cleanupTasks].reverse()) {
    try {
      logger.debug({ task: name }, 'Executing cleanup task');
      await handler();
      logger.debug({ task: name }, 'Cleanup task completed');
    } catch (err) {
      logger.error({ err, task: name }, 'Error executing cleanup task');
    }
  }
}
