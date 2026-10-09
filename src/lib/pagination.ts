import { z } from 'zod';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../config/constants.js';

export interface CursorPayload {
  createdAt: Date;
  id: string;
}

export interface PageInfo {
  nextCursor: string | null;
  hasMore: boolean;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  success: boolean;
  data: T[];
  pageInfo: PageInfo;
  meta?: PaginationMeta;
}

export interface OffsetPaginatedResult<T> {
  success: boolean;
  data: T[];
  meta: PaginationMeta;
}

export type SortOrder = 'asc' | 'desc';

/**
 * Standard Zod pagination schema reusable across all query validation schemas.
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  cursor: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().optional(),
});

export type PaginationQuery = z.infer<typeof paginationSchema>;

/**
 * Helper to compute SQL OFFSET from page and limit.
 */
export function calculateOffset(page: number, limit: number): number {
  const safePage = Math.max(page, 1);
  const clampedLimit = Math.min(Math.max(limit, 1), MAX_PAGE_SIZE);
  return (safePage - 1) * clampedLimit;
}

/**
 * Normalizes a sort order string to 'asc' or 'desc'.
 */
export function resolveSortOrder(order?: string): SortOrder {
  return order?.toLowerCase() === 'asc' ? 'asc' : 'desc';
}

/**
 * Encodes cursor fields into an opaque URL-safe base64 string.
 */
export function encodeCursor(payload: CursorPayload): string {
  const json = JSON.stringify({
    createdAt: payload.createdAt.toISOString(),
    id: payload.id,
  });
  return Buffer.from(json, 'utf8').toString('base64url');
}

/**
 * Decodes an opaque URL-safe base64 cursor back into cursor fields.
 * Returns null if the cursor is malformed or invalid.
 */
export function decodeCursor(cursor: string): CursorPayload | null {
  try {
    const raw = Buffer.from(cursor, 'base64url').toString('utf8');
    const parsed = JSON.parse(raw) as { createdAt?: string; id?: string };

    if (!parsed.createdAt || !parsed.id || typeof parsed.id !== 'string') {
      return null;
    }

    const createdAt = new Date(parsed.createdAt);
    if (isNaN(createdAt.getTime())) {
      return null;
    }

    return { createdAt, id: parsed.id };
  } catch {
    return null;
  }
}

/**
 * Builds a standardized paginated response from a fetched batch of (limit + 1) items.
 */
export function buildPaginatedResponse<T>(
  items: T[],
  limit: number,
  getCursorData: (item: T) => CursorPayload,
  options?: {
    total?: number;
    page?: number;
  },
): PaginatedResult<T> {
  const clampedLimit = Math.min(Math.max(limit, 1), MAX_PAGE_SIZE);
  const hasMore = items.length > clampedLimit;
  const data = hasMore ? items.slice(0, clampedLimit) : items;

  let nextCursor: string | null = null;
  if (hasMore && data.length > 0) {
    const lastItem = data[data.length - 1];
    if (lastItem) {
      nextCursor = encodeCursor(getCursorData(lastItem));
    }
  }

  const result: PaginatedResult<T> = {
    success: true,
    data,
    pageInfo: {
      nextCursor,
      hasMore,
    },
  };

  if (options?.total !== undefined) {
    const safePage = Math.max(options.page ?? 1, 1);
    result.meta = {
      total: options.total,
      page: safePage,
      limit: clampedLimit,
      totalPages: Math.ceil(options.total / clampedLimit),
    };
  }

  return result;
}

/**
 * Builds a standardized offset-paginated response with metadata.
 */
export function buildOffsetPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): OffsetPaginatedResult<T> {
  const clampedLimit = Math.min(Math.max(limit, 1), MAX_PAGE_SIZE);
  const safePage = Math.max(page, 1);
  const totalPages = Math.ceil(total / clampedLimit);

  return {
    success: true,
    data,
    meta: {
      total,
      page: safePage,
      limit: clampedLimit,
      totalPages,
    },
  };
}

export { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE };
