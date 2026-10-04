import type { Server } from 'node:http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { SHUTDOWN_TIMEOUT_MS } from './config/constants.js';
import { logger } from './lib/logger.js';
import { runCleanupTasks } from './lib/cleanup.js';

const app = createApp();

let server: Server | null = null;
let isShuttingDown = false;

export async function shutdown(signal: string, exitCode = 0): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info({ signal }, 'Graceful shutdown initiated');

  const forceTimer = setTimeout(() => {
    logger.error('Shutdown timeout exceeded. Forcing exit.');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  forceTimer.unref();

  try {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server?.close((err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
      logger.info('HTTP server closed');
    }

    await runCleanupTasks();
    logger.info('Graceful shutdown completed successfully');
    process.exit(exitCode);
  } catch (err) {
    logger.error({ err }, 'Error during shutdown');
    process.exit(1);
  }
}

// Global exception handlers
process.on('uncaughtException', (err: Error) => {
  logger.fatal({ err }, 'Uncaught exception detected, initiating shutdown');
  void shutdown('uncaughtException', 1);
});

process.on('unhandledRejection', (reason: unknown) => {
  logger.fatal({ reason }, 'Unhandled rejection detected, initiating shutdown');
  void shutdown('unhandledRejection', 1);
});

// Process signal listeners
process.on('SIGTERM', () => {
  void shutdown('SIGTERM', 0);
});

process.on('SIGINT', () => {
  void shutdown('SIGINT', 0);
});

server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV }, 'Learning Matters server started');
});

// Tune keepAliveTimeout and headersTimeout above typical load balancer idle timeouts (60s)
server.keepAliveTimeout = 65_000;
server.headersTimeout = 66_000;

export { server, app };
