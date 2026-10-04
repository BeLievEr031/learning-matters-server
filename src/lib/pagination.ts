import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../config/constants.js';

export interface CursorPayload {
  createdAt: Date;
  id: string;
}

export interface PageInfo {
  nextCursor: string | null;
  hasMore: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  pageInfo: PageInfo;
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

  return {
    data,
    pageInfo: {
      nextCursor,
      hasMore,
    },
  };
}

export { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE };
