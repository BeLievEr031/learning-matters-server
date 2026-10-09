import { z } from 'zod';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../../config/constants.js';

export const SCHOOL_STATUSES = ['active', 'inactive', 'suspended'] as const;

export const createSchoolSchema = z.object({
  name: z.string().min(1, 'School name is required').max(255),
  code: z.string().min(1, 'School code is required').max(50),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  phone: z.string().optional(),
  email: z.email().optional(),
  website: z.url().optional(),
  logoUrl: z.url().optional(),
  status: z.enum(SCHOOL_STATUSES).default('active'),
});

export const updateSchoolSchema = z.object({
  name: z.string().min(1, 'School name cannot be empty').max(255).optional(),
  code: z.string().min(1, 'School code cannot be empty').max(50).optional(),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.email().nullable().optional(),
  website: z.url().nullable().optional(),
  logoUrl: z.url().nullable().optional(),
  status: z.enum(SCHOOL_STATUSES).optional(),
});

export const SCHOOL_SORT_FIELDS = ['name', 'code', 'createdAt', 'status'] as const;

export const listSchoolsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  cursor: z.string().optional(),
  status: z.enum(SCHOOL_STATUSES).optional(),
  search: z.string().optional(),
  sortBy: z.enum(SCHOOL_SORT_FIELDS).default('createdAt').optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc').optional(),
});

export const schoolIdParamSchema = z.object({
  schoolId: z.uuid('Invalid school ID format'),
});

export type CreateSchoolInput = z.infer<typeof createSchoolSchema>;
export type UpdateSchoolInput = z.infer<typeof updateSchoolSchema>;
export type ListSchoolsQuery = z.infer<typeof listSchoolsQuerySchema>;
export type SchoolIdParam = z.infer<typeof schoolIdParamSchema>;
