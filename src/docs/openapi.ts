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
export const UserRoleSchema = z
  .enum(['super_admin', 'admin', 'principal', 'class_teacher', 'teacher', 'student'])
  .openapi('UserRole');

export const UserSafeSchema = z
  .object({
    id: z.uuid().openapi({ example: '11111111-1111-4111-a111-111111111111' }),
    email: z.email().openapi({ example: 'user@learning-matters.com' }),
    role: UserRoleSchema.openapi({ example: 'student' }),
    schoolId: z.uuid().nullable().openapi({ example: '22222222-2222-4222-a222-222222222222' }),
    firstName: z.string().nullable().openapi({ example: 'John' }),
    lastName: z.string().nullable().openapi({ example: 'Doe' }),
    phone: z.string().nullable().openapi({ example: '+1234567890' }),
    status: z.string().openapi({ example: 'active' }),
    isActive: z.boolean().openapi({ example: true }),
    createdAt: z.iso.datetime().openapi({ example: '2026-01-01T12:00:00.000Z' }),
    updatedAt: z.iso.datetime().openapi({ example: '2026-01-01T12:00:00.000Z' }),
    deletedAt: z.iso.datetime().nullable().openapi({ example: null }),
  })
  .openapi('User');

export const CreateUserRequestSchema = z
  .object({
    email: z.email().openapi({ example: 'newuser@learning-matters.com' }),
    password: z.string().min(12).openapi({ example: 'SecurePassword123!' }),
    role: UserRoleSchema.default('student').openapi({ example: 'student' }),
    schoolId: z.uuid().optional().openapi({ example: '22222222-2222-4222-a222-222222222222' }),
    firstName: z.string().optional().openapi({ example: 'John' }),
    lastName: z.string().optional().openapi({ example: 'Doe' }),
    phone: z.string().optional().openapi({ example: '+1234567890' }),
  })
  .openapi('CreateUserRequest');

export const UpdateUserRequestSchema = z
  .object({
    email: z.email().optional().openapi({ example: 'updated@learning-matters.com' }),
    role: UserRoleSchema.optional().openapi({ example: 'teacher' }),
    schoolId: z.uuid().optional().openapi({ example: '22222222-2222-4222-a222-222222222222' }),
    firstName: z.string().optional().openapi({ example: 'John' }),
    lastName: z.string().optional().openapi({ example: 'Doe' }),
    phone: z.string().optional().openapi({ example: '+1234567890' }),
    status: z.string().optional().openapi({ example: 'active' }),
    isActive: z.boolean().optional().openapi({ example: true }),
  })
  .openapi('UpdateUserRequest');

// ---------------------------------------------------------------------------
// School Schemas
// ---------------------------------------------------------------------------
export const SchoolStatusSchema = z
  .enum(['active', 'inactive', 'suspended'])
  .openapi('SchoolStatus');

export const SchoolSchema = z
  .object({
    id: z.uuid().openapi({ example: '11111111-1111-4111-a111-111111111111' }),
    name: z.string().openapi({ example: 'ABC International School' }),
    code: z.string().openapi({ example: 'ABC001' }),
    address: z.string().nullable().openapi({ example: '42 Knowledge Way' }),
    city: z.string().nullable().openapi({ example: 'New Delhi' }),
    state: z.string().nullable().openapi({ example: 'Delhi' }),
    country: z.string().nullable().openapi({ example: 'India' }),
    phone: z.string().nullable().openapi({ example: '+919876543210' }),
    email: z.email().nullable().openapi({ example: 'contact@abcschool.edu' }),
    website: z.url().nullable().openapi({ example: 'https://abcschool.edu' }),
    logoUrl: z.url().nullable().openapi({ example: 'https://abcschool.edu/logo.png' }),
    status: SchoolStatusSchema.openapi({ example: 'active' }),
    createdAt: z.iso.datetime().openapi({ example: '2026-01-01T12:00:00.000Z' }),
    updatedAt: z.iso.datetime().openapi({ example: '2026-01-01T12:00:00.000Z' }),
    deletedAt: z.iso.datetime().nullable().openapi({ example: null }),
  })
  .openapi('School');

export const CreateSchoolRequestSchema = z
  .object({
    name: z.string().min(1).max(255).openapi({ example: 'ABC International School' }),
    code: z.string().min(1).max(50).openapi({ example: 'ABC001' }),
    address: z.string().optional().openapi({ example: '42 Knowledge Way' }),
    city: z.string().optional().openapi({ example: 'New Delhi' }),
    state: z.string().optional().openapi({ example: 'Delhi' }),
    country: z.string().optional().openapi({ example: 'India' }),
    phone: z.string().optional().openapi({ example: '+919876543210' }),
    email: z.email().optional().openapi({ example: 'contact@abcschool.edu' }),
    website: z.url().optional().openapi({ example: 'https://abcschool.edu' }),
    logoUrl: z.url().optional().openapi({ example: 'https://abcschool.edu/logo.png' }),
    status: SchoolStatusSchema.default('active').openapi({ example: 'active' }),
  })
  .openapi('CreateSchoolRequest');

export const UpdateSchoolRequestSchema = z
  .object({
    name: z.string().min(1).max(255).optional().openapi({ example: 'ABC International Academy' }),
    code: z.string().min(1).max(50).optional().openapi({ example: 'ABC002' }),
    address: z.string().nullable().optional().openapi({ example: '42 Knowledge Way' }),
    city: z.string().nullable().optional().openapi({ example: 'New Delhi' }),
    state: z.string().nullable().openapi({ example: 'Delhi' }),
    country: z.string().nullable().optional().openapi({ example: 'India' }),
    phone: z.string().nullable().optional().openapi({ example: '+919876543210' }),
    email: z.email().nullable().optional().openapi({ example: 'contact@abcschool.edu' }),
    website: z.url().nullable().optional().openapi({ example: 'https://abcschool.edu' }),
    logoUrl: z.url().nullable().optional().openapi({ example: 'https://abcschool.edu/logo.png' }),
    status: SchoolStatusSchema.optional().openapi({ example: 'active' }),
  })
  .openapi('UpdateSchoolRequest');

// ---------------------------------------------------------------------------
// Board Schemas
// ---------------------------------------------------------------------------
export const BoardStatusSchema = z.enum(['active', 'inactive', 'archived']).openapi('BoardStatus');

export const BoardSchema = z
  .object({
    id: z.uuid().openapi({ example: '33333333-3333-4333-a333-333333333333' }),
    schoolId: z.uuid().openapi({ example: '11111111-1111-4111-a111-111111111111' }),
    name: z.string().openapi({ example: 'Central Board of Secondary Education' }),
    code: z.string().openapi({ example: 'CBSE' }),
    description: z.string().nullable().openapi({ example: 'National education curriculum board' }),
    status: BoardStatusSchema.openapi({ example: 'active' }),
    createdAt: z.iso.datetime().openapi({ example: '2026-01-01T12:00:00.000Z' }),
    updatedAt: z.iso.datetime().openapi({ example: '2026-01-01T12:00:00.000Z' }),
    deletedAt: z.iso.datetime().nullable().openapi({ example: null }),
  })
  .openapi('Board');

export const CreateBoardRequestSchema = z
  .object({
    name: z.string().min(1).max(255).openapi({ example: 'Central Board of Secondary Education' }),
    code: z.string().min(1).max(50).openapi({ example: 'CBSE' }),
    description: z
      .string()
      .max(1000)
      .optional()
      .openapi({ example: 'National education curriculum board' }),
    status: BoardStatusSchema.default('active').openapi({ example: 'active' }),
  })
  .openapi('CreateBoardRequest');

export const UpdateBoardRequestSchema = z
  .object({
    name: z
      .string()
      .min(1)
      .max(255)
      .optional()
      .openapi({ example: 'Indian Certificate of Secondary Education' }),
    code: z.string().min(1).max(50).optional().openapi({ example: 'ICSE' }),
    description: z
      .string()
      .max(1000)
      .nullable()
      .optional()
      .openapi({ example: 'National secondary curriculum' }),
    status: BoardStatusSchema.optional().openapi({ example: 'active' }),
  })
  .openapi('UpdateBoardRequest');

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
    role: UserRoleSchema.default('student').openapi({ example: 'student' }),
    schoolId: z.uuid().optional().openapi({ example: '22222222-2222-4222-a222-222222222222' }),
    firstName: z.string().optional().openapi({ example: 'Jane' }),
    lastName: z.string().optional().openapi({ example: 'Doe' }),
    phone: z.string().optional().openapi({ example: '+1234567890' }),
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

registry.registerPath({
  method: 'get',
  path: '/api/v1/auth/me',
  tags: ['Auth'],
  summary: 'Get current authenticated user profile',
  description: 'Returns the full profile of the authenticated user based on the access token.',
  security: [{ [bearerAuth.name]: [] }],
  responses: {
    200: {
      description: 'Current user profile',
      content: {
        'application/json': {
          schema: z.object({ user: UserSafeSchema }),
        },
      },
    },
    401: {
      description: 'Authentication required',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    404: {
      description: 'User not found',
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
// Schools Endpoints
// ---------------------------------------------------------------------------
registry.registerPath({
  method: 'post',
  path: '/api/v1/schools',
  tags: ['Schools'],
  summary: 'Create a new school (Super Admin only)',
  security: [{ [bearerAuth.name]: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateSchoolRequestSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'School created successfully',
      content: {
        'application/json': {
          schema: z.object({ data: SchoolSchema }),
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
      description: 'Forbidden: Super Admin only',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    409: {
      description: 'School with this code already exists',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/schools',
  tags: ['Schools'],
  summary: 'List schools with pagination and filtering (Super Admin only)',
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
      status: SchoolStatusSchema.optional().openapi({ example: 'active' }),
      search: z.string().optional().openapi({ example: 'Greenwood' }),
    }),
  },
  responses: {
    200: {
      description: 'Paginated schools list',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(SchoolSchema),
            pageInfo: PageInfoSchema,
          }),
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
      description: 'Forbidden: Super Admin only',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/schools/{schoolId}',
  tags: ['Schools'],
  summary: 'Get school by ID (Super Admin or own-school Admin/Principal)',
  security: [{ [bearerAuth.name]: [] }],
  request: {
    params: z.object({
      schoolId: z.uuid().openapi({ example: '11111111-1111-4111-a111-111111111111' }),
    }),
  },
  responses: {
    200: {
      description: 'School details',
      content: {
        'application/json': {
          schema: z.object({ data: SchoolSchema }),
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
      description: 'Forbidden: Insufficient permissions or wrong school scope',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    404: {
      description: 'School not found',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'patch',
  path: '/api/v1/schools/{schoolId}',
  tags: ['Schools'],
  summary: 'Update school by ID (Super Admin only)',
  security: [{ [bearerAuth.name]: [] }],
  request: {
    params: z.object({
      schoolId: z.uuid().openapi({ example: '11111111-1111-4111-a111-111111111111' }),
    }),
    body: {
      content: {
        'application/json': {
          schema: UpdateSchoolRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'School updated successfully',
      content: {
        'application/json': {
          schema: z.object({ data: SchoolSchema }),
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
      description: 'Forbidden: Super Admin only',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    404: {
      description: 'School not found',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    409: {
      description: 'School with this code already exists',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'delete',
  path: '/api/v1/schools/{schoolId}',
  tags: ['Schools'],
  summary: 'Soft-delete school by ID (Super Admin only)',
  security: [{ [bearerAuth.name]: [] }],
  request: {
    params: z.object({
      schoolId: z.uuid().openapi({ example: '11111111-1111-4111-a111-111111111111' }),
    }),
  },
  responses: {
    204: {
      description: 'School soft-deleted successfully',
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
      description: 'Forbidden: Super Admin only',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    404: {
      description: 'School not found',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

// ---------------------------------------------------------------------------
// Board Endpoints
// ---------------------------------------------------------------------------
registry.registerPath({
  method: 'post',
  path: '/api/v1/schools/{schoolId}/boards',
  tags: ['Boards'],
  summary: 'Create board in school (Super Admin or School Admin)',
  security: [{ [bearerAuth.name]: [] }],
  request: {
    params: z.object({
      schoolId: z.uuid().openapi({ example: '11111111-1111-4111-a111-111111111111' }),
    }),
    body: {
      required: true,
      content: {
        'application/json': {
          schema: CreateBoardRequestSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Board created successfully',
      content: {
        'application/json': {
          schema: z.object({ data: BoardSchema }),
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
      description: 'Forbidden: Super Admin or own-school Admin only',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    404: {
      description: 'School not found',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    409: {
      description: 'Board with this code already exists for this school',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/schools/{schoolId}/boards',
  tags: ['Boards'],
  summary: 'List boards in school (Super Admin, School Admin, or Principal)',
  security: [{ [bearerAuth.name]: [] }],
  request: {
    params: z.object({
      schoolId: z.uuid().openapi({ example: '11111111-1111-4111-a111-111111111111' }),
    }),
    query: z.object({
      limit: z.coerce
        .number()
        .int()
        .min(1)
        .max(MAX_PAGE_SIZE)
        .default(DEFAULT_PAGE_SIZE)
        .optional(),
      cursor: z.string().optional().openapi({ example: 'ZXhhbXBsZQ==' }),
      status: BoardStatusSchema.optional(),
      search: z.string().optional().openapi({ example: 'CBSE' }),
    }),
  },
  responses: {
    200: {
      description: 'Paginated list of boards for the school',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(BoardSchema),
            pageInfo: PageInfoSchema,
          }),
        },
      },
    },
    400: {
      description: 'Invalid query parameters or school ID',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    401: {
      description: 'Authentication required',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    403: {
      description: 'Forbidden: Super Admin or own-school access only',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    404: {
      description: 'School not found',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/boards/{boardId}',
  tags: ['Boards'],
  summary: 'Get board by ID (Super Admin, School Admin, or Principal)',
  security: [{ [bearerAuth.name]: [] }],
  request: {
    params: z.object({
      boardId: z.uuid().openapi({ example: '33333333-3333-4333-a333-333333333333' }),
    }),
  },
  responses: {
    200: {
      description: 'Board details retrieved successfully',
      content: {
        'application/json': {
          schema: z.object({ data: BoardSchema }),
        },
      },
    },
    400: {
      description: 'Invalid board ID format',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    401: {
      description: 'Authentication required',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    403: {
      description: 'Forbidden: Access to this board is not allowed',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    404: {
      description: 'Board not found',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'patch',
  path: '/api/v1/boards/{boardId}',
  tags: ['Boards'],
  summary: 'Update board by ID (Super Admin or School Admin)',
  security: [{ [bearerAuth.name]: [] }],
  request: {
    params: z.object({
      boardId: z.uuid().openapi({ example: '33333333-3333-4333-a333-333333333333' }),
    }),
    body: {
      required: true,
      content: {
        'application/json': {
          schema: UpdateBoardRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Board updated successfully',
      content: {
        'application/json': {
          schema: z.object({ data: BoardSchema }),
        },
      },
    },
    400: {
      description: 'Validation error or invalid board ID format',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    401: {
      description: 'Authentication required',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    403: {
      description: 'Forbidden: Super Admin or own-school Admin only',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    404: {
      description: 'Board not found',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    409: {
      description: 'Board with this code already exists for this school',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'delete',
  path: '/api/v1/boards/{boardId}',
  tags: ['Boards'],
  summary: 'Soft-delete board by ID (Super Admin or School Admin)',
  security: [{ [bearerAuth.name]: [] }],
  request: {
    params: z.object({
      boardId: z.uuid().openapi({ example: '33333333-3333-4333-a333-333333333333' }),
    }),
  },
  responses: {
    204: {
      description: 'Board soft-deleted successfully',
    },
    400: {
      description: 'Invalid board ID format',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    401: {
      description: 'Authentication required',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    403: {
      description: 'Forbidden: Super Admin or own-school Admin only',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    404: {
      description: 'Board not found',
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
