import { z } from 'zod';
import {
  extendZodWithOpenApi,
  OpenAPIRegistry,
  OpenApiGeneratorV3,
} from '@asteasolutions/zod-to-openapi';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../config/constants.js';

extendZodWithOpenApi(z);

export const registry = new OpenAPIRegistry();

// ---------------------------------------------------------------------------
// Security Schemes
// ---------------------------------------------------------------------------
export const bearerAuth = registry.registerComponent('securitySchemes', 'bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
  description: 'Enter your short-lived access JWT (e.g. Bearer <token>)',
});

// ---------------------------------------------------------------------------
// Shared Reusable Schemas
// ---------------------------------------------------------------------------
export const ErrorDetailSchema = z
  .object({
    field: z.string().optional().openapi({ example: 'email' }),
    message: z.string().openapi({ example: 'Invalid email address' }),
  })
  .openapi('ErrorDetail');

export const ErrorResponseSchema = z
  .object({
    error: z.object({
      code: z.string().openapi({ example: 'VALIDATION_ERROR' }),
      message: z.string().openapi({ example: 'Request validation failed' }),
      details: z.array(ErrorDetailSchema).optional(),
    }),
  })
  .openapi('ErrorResponse');

export const PageInfoSchema = z
  .object({
    nextCursor: z.string().nullable().openapi({ example: 'ZXhhbXBsZQ==' }),
    hasMore: z.boolean().openapi({ example: true }),
  })
  .openapi('PageInfo');

// ---------------------------------------------------------------------------
// User Schemas
// ---------------------------------------------------------------------------
export const UserSafeSchema = z
  .object({
    id: z.uuid().openapi({ example: '11111111-1111-4111-a111-111111111111' }),
    email: z.email().openapi({ example: 'user@learning-matters.com' }),
    role: z.enum(['user', 'admin']).openapi({ example: 'user' }),
    isActive: z.boolean().openapi({ example: true }),
    createdAt: z.iso.datetime().openapi({ example: '2026-01-01T12:00:00.000Z' }),
    updatedAt: z.iso.datetime().openapi({ example: '2026-01-01T12:00:00.000Z' }),
    deletedAt: z.iso.datetime().nullable().openapi({ example: null }),
  })
  .openapi('User');

export const CreateUserRequestSchema = z
  .object({
    email: z.email().openapi({ example: 'newuser@learning-matters.com' }),
    password: z.string().min(8).openapi({ example: 'SecurePassword123!' }),
    role: z.enum(['user', 'admin']).default('user').openapi({ example: 'user' }),
  })
  .openapi('CreateUserRequest');

export const UpdateUserRequestSchema = z
  .object({
    email: z.email().optional().openapi({ example: 'updated@learning-matters.com' }),
    role: z.enum(['user', 'admin']).optional().openapi({ example: 'admin' }),
    isActive: z.boolean().optional().openapi({ example: true }),
  })
  .openapi('UpdateUserRequest');

// ---------------------------------------------------------------------------
// Auth Schemas
// ---------------------------------------------------------------------------
export const TokenPairSchema = z
  .object({
    accessToken: z.string().openapi({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' }),
    refreshToken: z.string().openapi({ example: '7d5a8b299e52c80388d7fce5b5b9...' }),
  })
  .openapi('TokenPair');

export const AuthResponseSchema = z
  .object({
    user: UserSafeSchema,
    tokens: TokenPairSchema,
  })
  .openapi('AuthResponse');

export const RegisterRequestSchema = z
  .object({
    email: z.email().openapi({ example: 'student@learning-matters.com' }),
    password: z.string().min(12).openapi({ example: 'SuperSecure123!' }),
    role: z.enum(['user', 'admin']).default('user').openapi({ example: 'user' }),
  })
  .openapi('RegisterRequest');

export const LoginRequestSchema = z
  .object({
    email: z.email().openapi({ example: 'student@learning-matters.com' }),
    password: z.string().min(1).openapi({ example: 'SuperSecure123!' }),
  })
  .openapi('LoginRequest');

export const RefreshRequestSchema = z
  .object({
    refreshToken: z.string().min(1).openapi({ example: '7d5a8b299e52c80388d7fce5b5b9...' }),
  })
  .openapi('RefreshRequest');

export const RefreshResponseSchema = z
  .object({
    tokens: TokenPairSchema,
  })
  .openapi('RefreshResponse');

export const LogoutRequestSchema = z
  .object({
    refreshToken: z.string().min(1).openapi({ example: '7d5a8b299e52c80388d7fce5b5b9...' }),
  })
  .openapi('LogoutRequest');

// ---------------------------------------------------------------------------
// Health Endpoints
// ---------------------------------------------------------------------------
registry.registerPath({
  method: 'get',
  path: '/healthz',
  tags: ['Health'],
  summary: 'Liveness and uptime check',
  responses: {
    200: {
      description: 'Service is alive',
      content: {
        'application/json': {
          schema: z.object({
            status: z.string().openapi({ example: 'ok' }),
            timestamp: z.iso.datetime(),
          }),
        },
      },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/live',
  tags: ['Health'],
  summary: 'Kubernetes liveness probe',
  responses: {
    200: {
      description: 'Application process is responsive',
      content: {
        'application/json': {
          schema: z.object({
            status: z.string().openapi({ example: 'ok' }),
          }),
        },
      },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/ready',
  tags: ['Health'],
  summary: 'Kubernetes readiness probe',
  description: 'Verifies database pool and dependent systems before accepting traffic.',
  responses: {
    200: {
      description: 'Service is ready to handle traffic',
      content: {
        'application/json': {
          schema: z.object({
            status: z.string().openapi({ example: 'ready' }),
            checks: z.object({
              database: z.string().openapi({ example: 'ok' }),
            }),
          }),
        },
      },
    },
    503: {
      description: 'Service or dependent system is not ready',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

// ---------------------------------------------------------------------------
// Auth Endpoints
// ---------------------------------------------------------------------------
registry.registerPath({
  method: 'post',
  path: '/api/v1/auth/register',
  tags: ['Auth'],
  summary: 'Register a new user account',
  description:
    'Creates a new user with argon2 password hashing and returns access + refresh tokens. Rate limited.',
  request: {
    body: {
      content: {
        'application/json': {
          schema: RegisterRequestSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'User registered successfully',
      content: {
        'application/json': {
          schema: AuthResponseSchema,
        },
      },
    },
    400: {
      description: 'Validation error (e.g. password < 12 characters)',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    409: {
      description: 'User with this email already exists',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    429: {
      description: 'Too many authentication attempts',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/auth/login',
  tags: ['Auth'],
  summary: 'Authenticate credentials and issue tokens',
  description:
    'Constant-time verification against argon2 hashes to prevent user enumeration. Rate limited.',
  request: {
    body: {
      content: {
        'application/json': {
          schema: LoginRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Successfully authenticated',
      content: {
        'application/json': {
          schema: AuthResponseSchema,
        },
      },
    },
    400: {
      description: 'Validation error',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    401: {
      description: 'Invalid email or password (generic to avoid enumeration)',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    429: {
      description: 'Too many authentication attempts',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/auth/refresh',
  tags: ['Auth'],
  summary: 'Rotate refresh token',
  description:
    'Validates raw refresh token against SHA-256 hash, revokes it, and issues a new pair. If a revoked token is reused, all tokens in the family are immediately revoked.',
  request: {
    body: {
      content: {
        'application/json': {
          schema: RefreshRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Tokens successfully rotated',
      content: {
        'application/json': {
          schema: RefreshResponseSchema,
        },
      },
    },
    400: {
      description: 'Validation error',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    401: {
      description: 'Invalid, expired, or reused refresh token',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    429: {
      description: 'Too many authentication attempts',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/auth/logout',
  tags: ['Auth'],
  summary: 'Revoke single refresh token',
  description: 'Revokes the specified refresh token session.',
  request: {
    body: {
      content: {
        'application/json': {
          schema: LogoutRequestSchema,
        },
      },
    },
  },
  responses: {
    204: {
      description: 'Successfully logged out session',
    },
    400: {
      description: 'Validation error',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/auth/logout-all',
  tags: ['Auth'],
  summary: 'Revoke all sessions for current user',
  description: 'Revokes all active refresh tokens belonging to the authenticated user.',
  security: [{ [bearerAuth.name]: [] }],
  responses: {
    204: {
      description: 'Successfully revoked all user sessions',
    },
    401: {
      description: 'Authentication required',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

// ---------------------------------------------------------------------------
// Users Endpoints
// ---------------------------------------------------------------------------
registry.registerPath({
  method: 'get',
  path: '/api/v1/users/me',
  tags: ['Users'],
  summary: 'Get current user profile',
  security: [{ [bearerAuth.name]: [] }],
  responses: {
    200: {
      description: 'Current user profile without password_hash',
      content: {
        'application/json': {
          schema: z.object({ data: UserSafeSchema }),
        },
      },
    },
    401: {
      description: 'Authentication required',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'patch',
  path: '/api/v1/users/me',
  tags: ['Users'],
  summary: 'Update current user profile',
  security: [{ [bearerAuth.name]: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: UpdateUserRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Updated user profile',
      content: {
        'application/json': {
          schema: z.object({ data: UserSafeSchema }),
        },
      },
    },
    400: {
      description: 'Validation error',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    401: {
      description: 'Authentication required',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    409: {
      description: 'Email already taken',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/users',
  tags: ['Users'],
  summary: 'List users with cursor pagination (Admin only)',
  security: [{ [bearerAuth.name]: [] }],
  request: {
    query: z.object({
      limit: z.coerce
        .number()
        .int()
        .min(1)
        .max(MAX_PAGE_SIZE)
        .default(DEFAULT_PAGE_SIZE)
        .openapi({ example: 20 }),
      cursor: z.string().optional().openapi({ example: 'ZXhhbXBsZQ==' }),
    }),
  },
  responses: {
    200: {
      description: 'Paginated user list',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(UserSafeSchema),
            pageInfo: PageInfoSchema,
          }),
        },
      },
    },
    400: {
      description: 'Validation error (e.g. limit > 100)',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    401: {
      description: 'Authentication required',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    403: {
      description: 'Forbidden: Admin only',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/users',
  tags: ['Users'],
  summary: 'Create a new user',
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateUserRequestSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'User created successfully',
      content: {
        'application/json': {
          schema: z.object({ data: UserSafeSchema }),
        },
      },
    },
    400: {
      description: 'Validation error',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    409: {
      description: 'Email already exists',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/users/{id}',
  tags: ['Users'],
  summary: 'Get user by ID',
  security: [{ [bearerAuth.name]: [] }],
  request: {
    params: z.object({
      id: z.uuid().openapi({ example: '11111111-1111-4111-a111-111111111111' }),
    }),
  },
  responses: {
    200: {
      description: 'User data without password_hash',
      content: {
        'application/json': {
          schema: z.object({ data: UserSafeSchema }),
        },
      },
    },
    400: {
      description: 'Invalid UUID format',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    401: {
      description: 'Authentication required',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    403: {
      description: 'Forbidden (not owner or admin)',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    404: {
      description: 'User not found',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'patch',
  path: '/api/v1/users/{id}',
  tags: ['Users'],
  summary: 'Update user by ID',
  security: [{ [bearerAuth.name]: [] }],
  request: {
    params: z.object({
      id: z.uuid().openapi({ example: '11111111-1111-4111-a111-111111111111' }),
    }),
    body: {
      content: {
        'application/json': {
          schema: UpdateUserRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'User updated successfully',
      content: {
        'application/json': {
          schema: z.object({ data: UserSafeSchema }),
        },
      },
    },
    400: {
      description: 'Validation error',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    401: {
      description: 'Authentication required',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    403: {
      description: 'Forbidden (not owner or non-admin attempting role change)',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    404: {
      description: 'User not found',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    409: {
      description: 'Email already taken',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'delete',
  path: '/api/v1/users/{id}',
  tags: ['Users'],
  summary: 'Soft-delete user by ID (Admin only)',
  security: [{ [bearerAuth.name]: [] }],
  request: {
    params: z.object({
      id: z.uuid().openapi({ example: '11111111-1111-4111-a111-111111111111' }),
    }),
  },
  responses: {
    204: {
      description: 'User soft-deleted successfully',
    },
    400: {
      description: 'Invalid UUID format',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    401: {
      description: 'Authentication required',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    403: {
      description: 'Forbidden: Admin only',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    404: {
      description: 'User not found',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

// ---------------------------------------------------------------------------
// Document Generator
// ---------------------------------------------------------------------------
export function buildOpenApiDocument() {
  const generator = new OpenApiGeneratorV3(registry.definitions);
  return generator.generateDocument({
    openapi: '3.0.3',
    info: {
      title: 'Learning Matters API',
      version: '1.0.0',
      description:
        'Production-grade REST API backend for Learning Matters with strict TypeScript, Express 5, JWT authentication with rotating refresh tokens, RBAC, and structured observability.',
    },
    servers: [
      {
        url: '/',
        description: 'Current environment server',
      },
    ],
  });
}

export const openApiDocument = buildOpenApiDocument();
