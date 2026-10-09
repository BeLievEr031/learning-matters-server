import { describe, it, expect } from 'vitest';
import {
  encodeCursor,
  decodeCursor,
  buildPaginatedResponse,
  buildOffsetPaginatedResponse,
  calculateOffset,
  resolveSortOrder,
  paginationSchema,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from './pagination.js';

describe('Pagination Utilities', () => {
  const sampleDate = new Date('2026-02-15T12:00:00.000Z');
  const sampleId = '123e4567-e89b-12d3-a456-426614174000';

  describe('encodeCursor & decodeCursor', () => {
    it('encodes and decodes valid cursor payload correctly', () => {
      const encoded = encodeCursor({ createdAt: sampleDate, id: sampleId });
      expect(typeof encoded).toBe('string');

      const decoded = decodeCursor(encoded);
      expect(decoded).not.toBeNull();
      expect(decoded?.id).toBe(sampleId);
      expect(decoded?.createdAt.toISOString()).toBe(sampleDate.toISOString());
    });

    it('returns null when cursor string is malformed base64/JSON', () => {
      expect(decodeCursor('invalid-base64-string')).toBeNull();
      expect(decodeCursor('')).toBeNull();
      expect(decodeCursor(Buffer.from('not json').toString('base64url'))).toBeNull();
    });

    it('returns null when cursor payload is missing fields or id is not a string', () => {
      const missingId = Buffer.from(
        JSON.stringify({ createdAt: sampleDate.toISOString() }),
      ).toString('base64url');
      expect(decodeCursor(missingId)).toBeNull();

      const missingCreatedAt = Buffer.from(JSON.stringify({ id: sampleId })).toString('base64url');
      expect(decodeCursor(missingCreatedAt)).toBeNull();

      const nonStringId = Buffer.from(
        JSON.stringify({ createdAt: sampleDate.toISOString(), id: 12345 }),
      ).toString('base64url');
      expect(decodeCursor(nonStringId)).toBeNull();
    });

    it('returns null when createdAt is an invalid date string', () => {
      const invalidDate = Buffer.from(
        JSON.stringify({ createdAt: 'invalid-date', id: sampleId }),
      ).toString('base64url');
      expect(decodeCursor(invalidDate)).toBeNull();
    });
  });

  describe('buildPaginatedResponse', () => {
    interface Item {
      id: string;
      createdAt: Date;
    }

    const items: Item[] = [
      { id: '1', createdAt: new Date('2026-01-03') },
      { id: '2', createdAt: new Date('2026-01-02') },
      { id: '3', createdAt: new Date('2026-01-01') },
    ];

    it('returns paginated response with nextCursor when items exceed limit', () => {
      const result = buildPaginatedResponse(items, 2, (item) => ({
        id: item.id,
        createdAt: item.createdAt,
      }));

      expect(result.data).toHaveLength(2);
      expect(result.pageInfo.hasMore).toBe(true);
      expect(result.pageInfo.nextCursor).not.toBeNull();

      const decoded = decodeCursor(result.pageInfo.nextCursor ?? '');
      expect(decoded?.id).toBe('2');
    });

    it('returns paginated response with null nextCursor when items <= limit', () => {
      const result = buildPaginatedResponse(items.slice(0, 2), 2, (item) => ({
        id: item.id,
        createdAt: item.createdAt,
      }));

      expect(result.data).toHaveLength(2);
      expect(result.pageInfo.hasMore).toBe(false);
      expect(result.pageInfo.nextCursor).toBeNull();
    });

    it('clamps limit to [1, MAX_PAGE_SIZE]', () => {
      const resultMin = buildPaginatedResponse(items, 0, (item) => ({
        id: item.id,
        createdAt: item.createdAt,
      }));
      expect(resultMin.data).toHaveLength(1);

      const resultMax = buildPaginatedResponse<Item>([], 1000, (item) => ({
        id: item.id,
        createdAt: item.createdAt,
      }));
      expect(resultMax.pageInfo.hasMore).toBe(false);
      expect(DEFAULT_PAGE_SIZE).toBe(20);
      expect(MAX_PAGE_SIZE).toBe(100);
    });

    it('includes meta when total and page options are passed', () => {
      const result = buildPaginatedResponse(
        items,
        2,
        (item) => ({ id: item.id, createdAt: item.createdAt }),
        { total: 50, page: 2 },
      );

      expect(result.success).toBe(true);
      expect(result.meta).toEqual({
        total: 50,
        page: 2,
        limit: 2,
        totalPages: 25,
      });
    });
  });

  describe('buildOffsetPaginatedResponse', () => {
    it('constructs correct metadata for offset pagination', () => {
      const data = [{ id: '1' }, { id: '2' }];
      const result = buildOffsetPaginatedResponse(data, 45, 2, 10);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(data);
      expect(result.meta).toEqual({
        total: 45,
        page: 2,
        limit: 10,
        totalPages: 5,
      });
    });

    it('handles total 0 and page 1 correctly', () => {
      const result = buildOffsetPaginatedResponse([], 0, 1, 20);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      expect(result.meta).toEqual({
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      });
    });
  });

  describe('calculateOffset & resolveSortOrder', () => {
    it('computes SQL offset accurately', () => {
      expect(calculateOffset(1, 20)).toBe(0);
      expect(calculateOffset(2, 20)).toBe(20);
      expect(calculateOffset(3, 10)).toBe(20);
      expect(calculateOffset(0, 10)).toBe(0); // clamps to page 1
    });

    it('resolves sort order correctly', () => {
      expect(resolveSortOrder('ASC')).toBe('asc');
      expect(resolveSortOrder('asc')).toBe('asc');
      expect(resolveSortOrder('DESC')).toBe('desc');
      expect(resolveSortOrder('desc')).toBe('desc');
      expect(resolveSortOrder(undefined)).toBe('desc');
      expect(resolveSortOrder('invalid')).toBe('desc');
    });
  });

  describe('paginationSchema', () => {
    it('applies standard defaults', () => {
      const parsed = paginationSchema.parse({});
      expect(parsed.page).toBe(1);
      expect(parsed.limit).toBe(DEFAULT_PAGE_SIZE);
      expect(parsed.sortOrder).toBe('desc');
      expect(parsed.sortBy).toBeUndefined();
      expect(parsed.search).toBeUndefined();
    });

    it('parses valid query parameters', () => {
      const parsed = paginationSchema.parse({
        page: '3',
        limit: '15',
        sortBy: 'name',
        sortOrder: 'asc',
        search: 'springfield',
      });
      expect(parsed.page).toBe(3);
      expect(parsed.limit).toBe(15);
      expect(parsed.sortBy).toBe('name');
      expect(parsed.sortOrder).toBe('asc');
      expect(parsed.search).toBe('springfield');
    });
  });
});
