import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { env } from '../config/env.js';
import { openApiDocument } from './openapi.js';

export const docsRouter: Router = Router();

// Raw OpenAPI JSON specification
docsRouter.get('/api/v1/openapi.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.status(200).json(openApiDocument);
});

// Swagger UI documentation (disabled in production unless ENABLE_DOCS is enabled)
const isDocsEnabled = env.NODE_ENV !== 'production' || env.ENABLE_DOCS;

if (isDocsEnabled) {
  docsRouter.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));
}
