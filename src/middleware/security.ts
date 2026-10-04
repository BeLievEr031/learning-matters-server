import helmet from 'helmet';
import cors, { type CorsOptions } from 'cors';
import hpp from 'hpp';
import type { RequestHandler } from 'express';
import { env } from '../config/env.js';
import { ForbiddenError } from '../lib/app-error.js';

export const helmetMiddleware: RequestHandler = helmet({
  ...(env.NODE_ENV !== 'production' && {
    contentSecurityPolicy: false,
  }),
  crossOriginEmbedderPolicy: false,
});

export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Requests from server-side clients or tools without origin header are allowed
    if (!origin) {
      callback(null, true);
      return;
    }

    if (env.CORS_ORIGINS.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new ForbiddenError(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id'],
  exposedHeaders: ['x-request-id'],
};

export const corsMiddleware: RequestHandler = cors(corsOptions);

export const hppMiddleware: RequestHandler = hpp();
