import express, { type Express } from 'express';
import { env } from './config/env.js';
import { BODY_SIZE_LIMIT } from './config/constants.js';

/**
 * Creates and configures the Express application.
 * Does not start the HTTP listener so it can be tested in isolation.
 */
export function createApp(): Express {
  const app = express();

  // Reverse proxy trust hops
  app.set('trust proxy', env.TRUST_PROXY);

  // Security hygiene: disable X-Powered-By
  app.disable('x-powered-by');

  // Request body parsing with strict size limits
  app.use(express.json({ limit: BODY_SIZE_LIMIT }));
  app.use(express.urlencoded({ extended: false, limit: BODY_SIZE_LIMIT }));

  return app;
}
