import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { openApiDocument } from './openapi.js';

const outputPath = resolve(process.cwd(), 'openapi.json');
writeFileSync(outputPath, JSON.stringify(openApiDocument, null, 2), 'utf-8');

// eslint-disable-next-line no-console
console.log(`OpenAPI specification written to ${outputPath}`);
