/**
 * Non-environment constants for the application.
 * Values here do not change based on the environment.
 */

/** Maximum number of items per paginated list request. */
export const MAX_PAGE_SIZE = 100;

/** Default number of items per paginated list request. */
export const DEFAULT_PAGE_SIZE = 20;

/** Number of bcrypt/argon2 hash rounds in development (lower for speed). */
export const ARGON2_MEMORY_COST = 65536; // 64 MiB
export const ARGON2_TIME_COST = 3;
export const ARGON2_PARALLELISM = 1;

/** Request body size limit */
export const BODY_SIZE_LIMIT = '100kb';

/** Graceful shutdown drain timeout in milliseconds. */
export const SHUTDOWN_TIMEOUT_MS = 10_000;

/** Refresh token reuse detection: maximum revoked tokens to keep per family. */
export const MAX_REVOKED_TOKENS_PER_FAMILY = 5;

/** API version prefix. */
export const API_V1 = '/api/v1';

/** Default initial password for automatically provisioned teacher user accounts. */
export const DEFAULT_TEACHER_PASSWORD = process.env.DEFAULT_TEACHER_PASSWORD ?? 'Teacher@123';

/** Maximum upload file size in bytes (25MB). */
export const MAX_UPLOAD_FILE_SIZE_BYTES = 25 * 1024 * 1024;
