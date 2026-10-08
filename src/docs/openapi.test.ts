import { describe, it, expect } from 'vitest';
import request from 'supertest';
import SwaggerParser from '@apidevtools/swagger-parser';
import { createApp } from '../app.js';
import { openApiDocument } from './openapi.js';

describe('OpenAPI Documentation & Swagger UI', () => {
  it('generates an OpenAPI spec that passes OpenAPI 3.0 schema validation', async () => {
    // Deep clone to prevent any in-place mutation by SwaggerParser
    const docCopy = JSON.parse(JSON.stringify(openApiDocument)) as Record<string, unknown>;
    const validated = await SwaggerParser.validate(docCopy as never);
    expect(validated).toBeDefined();
    expect(validated.info.title).toBe('Learning Matters API');
  });

  it('contains all required health, auth, and users endpoints', () => {
    const paths = openApiDocument.paths;
    expect(paths).toBeDefined();

    // Health
    expect(paths['/healthz']?.get).toBeDefined();
    expect(paths['/live']?.get).toBeDefined();
    expect(paths['/ready']?.get).toBeDefined();

    // Auth
    expect(paths['/api/v1/auth/register']?.post).toBeDefined();
    expect(paths['/api/v1/auth/login']?.post).toBeDefined();
    expect(paths['/api/v1/auth/refresh']?.post).toBeDefined();
    expect(paths['/api/v1/auth/logout']?.post).toBeDefined();
    expect(paths['/api/v1/auth/logout-all']?.post).toBeDefined();
    expect(paths['/api/v1/auth/me']?.get).toBeDefined();

    // Users
    expect(paths['/api/v1/users/me']?.get).toBeDefined();
    expect(paths['/api/v1/users/me']?.patch).toBeDefined();
    expect(paths['/api/v1/users']?.get).toBeDefined();
    expect(paths['/api/v1/users']?.post).toBeDefined();
    expect(paths['/api/v1/users/{id}']?.get).toBeDefined();
    expect(paths['/api/v1/users/{id}']?.patch).toBeDefined();
    expect(paths['/api/v1/users/{id}']?.delete).toBeDefined();

    // Schools
    expect(paths['/api/v1/schools']?.get).toBeDefined();
    expect(paths['/api/v1/schools']?.post).toBeDefined();
    expect(paths['/api/v1/schools/{schoolId}']?.get).toBeDefined();
    expect(paths['/api/v1/schools/{schoolId}']?.patch).toBeDefined();
    expect(paths['/api/v1/schools/{schoolId}']?.delete).toBeDefined();

    // Boards
    expect(paths['/api/v1/schools/{schoolId}/boards']?.post).toBeDefined();
    expect(paths['/api/v1/schools/{schoolId}/boards']?.get).toBeDefined();
    expect(paths['/api/v1/boards/{boardId}']?.get).toBeDefined();
    expect(paths['/api/v1/boards/{boardId}']?.patch).toBeDefined();
    expect(paths['/api/v1/boards/{boardId}']?.delete).toBeDefined();

    // Grades
    expect(paths['/api/v1/boards/{boardId}/grades']?.post).toBeDefined();
    expect(paths['/api/v1/boards/{boardId}/grades']?.get).toBeDefined();
    expect(paths['/api/v1/grades/{gradeId}']?.get).toBeDefined();
    expect(paths['/api/v1/grades/{gradeId}']?.patch).toBeDefined();
    expect(paths['/api/v1/grades/{gradeId}']?.delete).toBeDefined();

    // Subjects
    expect(paths['/api/v1/grades/{gradeId}/subjects']?.post).toBeDefined();
    expect(paths['/api/v1/grades/{gradeId}/subjects']?.get).toBeDefined();
    expect(paths['/api/v1/grades/{gradeId}/subjects/{subjectId}']?.delete).toBeDefined();
    expect(paths['/api/v1/subjects/{subjectId}']?.get).toBeDefined();
    expect(paths['/api/v1/subjects/{subjectId}']?.patch).toBeDefined();
    expect(paths['/api/v1/subjects/{subjectId}']?.delete).toBeDefined();
  });

  it('documents bearerAuth security on protected endpoints', () => {
    const paths = openApiDocument.paths;

    // Protected endpoints should require bearerAuth
    expect(paths['/api/v1/auth/logout-all']?.post?.security).toEqual([{ bearerAuth: [] }]);
    expect(paths['/api/v1/auth/me']?.get?.security).toEqual([{ bearerAuth: [] }]);
    expect(paths['/api/v1/users/me']?.get?.security).toEqual([{ bearerAuth: [] }]);
    expect(paths['/api/v1/users/me']?.patch?.security).toEqual([{ bearerAuth: [] }]);
    expect(paths['/api/v1/users']?.get?.security).toEqual([{ bearerAuth: [] }]);
    expect(paths['/api/v1/users/{id}']?.get?.security).toEqual([{ bearerAuth: [] }]);
    expect(paths['/api/v1/users/{id}']?.delete?.security).toEqual([{ bearerAuth: [] }]);
    expect(paths['/api/v1/schools/{schoolId}/boards']?.post?.security).toEqual([
      { bearerAuth: [] },
    ]);
    expect(paths['/api/v1/schools/{schoolId}/boards']?.get?.security).toEqual([{ bearerAuth: [] }]);
    expect(paths['/api/v1/boards/{boardId}']?.get?.security).toEqual([{ bearerAuth: [] }]);
    expect(paths['/api/v1/boards/{boardId}']?.patch?.security).toEqual([{ bearerAuth: [] }]);
    expect(paths['/api/v1/boards/{boardId}']?.delete?.security).toEqual([{ bearerAuth: [] }]);
    expect(paths['/api/v1/boards/{boardId}/grades']?.post?.security).toEqual([{ bearerAuth: [] }]);
    expect(paths['/api/v1/boards/{boardId}/grades']?.get?.security).toEqual([{ bearerAuth: [] }]);
    expect(paths['/api/v1/grades/{gradeId}']?.get?.security).toEqual([{ bearerAuth: [] }]);
    expect(paths['/api/v1/grades/{gradeId}']?.patch?.security).toEqual([{ bearerAuth: [] }]);
    expect(paths['/api/v1/grades/{gradeId}']?.delete?.security).toEqual([{ bearerAuth: [] }]);
    expect(paths['/api/v1/grades/{gradeId}/subjects']?.post?.security).toEqual([
      { bearerAuth: [] },
    ]);
    expect(paths['/api/v1/grades/{gradeId}/subjects']?.get?.security).toEqual([{ bearerAuth: [] }]);
    expect(paths['/api/v1/grades/{gradeId}/subjects/{subjectId}']?.delete?.security).toEqual([
      { bearerAuth: [] },
    ]);
    expect(paths['/api/v1/subjects/{subjectId}']?.get?.security).toEqual([{ bearerAuth: [] }]);
    expect(paths['/api/v1/subjects/{subjectId}']?.patch?.security).toEqual([{ bearerAuth: [] }]);
    expect(paths['/api/v1/subjects/{subjectId}']?.delete?.security).toEqual([{ bearerAuth: [] }]);

    // Public endpoints should NOT have security defined
    expect(paths['/api/v1/auth/login']?.post?.security).toBeUndefined();
    expect(paths['/api/v1/auth/register']?.post?.security).toBeUndefined();
  });

  it('serves GET /api/v1/openapi.json with 200 and valid JSON', async () => {
    const app = createApp();
    const res = await request(app).get('/api/v1/openapi.json');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/json');
    const body = res.body as { openapi: string; info: { title: string } };
    expect(body.openapi).toBe('3.0.3');
    expect(body.info.title).toBe('Learning Matters API');
  });

  it('serves Swagger UI at /api/docs in development/test', async () => {
    const app = createApp();
    const res = await request(app).get('/api/docs/');

    // Swagger UI index HTML should be served (200 or 301 redirect to trailing slash)
    expect([200, 301]).toContain(res.status);
    if (res.status === 200) {
      expect(res.text).toContain('Swagger UI');
    }
  });
});
