import { z } from 'zod';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../../config/constants.js';

export const SUBJECT_STATUSES = ['active', 'inactive', 'archived'] as const;

export const assignOrCreateSubjectSchema = z
  .object({
    subjectId: z.uuid('Invalid subject ID format').optional(),
    name: z.string().min(1, 'Subject name is required').max(255).optional(),
    code: z.string().min(1, 'Subject code is required').max(50).optional(),
    description: z.string().max(1000).optional(),
    status: z.enum(SUBJECT_STATUSES).optional(),
  })
  .refine(
    (data) => Boolean(data.subjectId) || Boolean(data.name && data.code),
    'Either subjectId or both name and code must be provided',
  );

export const createSubjectSchema = z.object({
  name: z.string().min(1, 'Subject name is required').max(255),
  code: z.string().min(1, 'Subject code is required').max(50),
  description: z.string().max(1000).optional(),
  status: z.enum(SUBJECT_STATUSES).default('active'),
});

export const updateSubjectSchema = z.object({
  name: z.string().min(1, 'Subject name cannot be empty').max(255).optional(),
  code: z.string().min(1, 'Subject code cannot be empty').max(50).optional(),
  description: z.string().max(1000).nullable().optional(),
  status: z.enum(SUBJECT_STATUSES).optional(),
});

export const SUBJECT_SORT_FIELDS = ['name', 'code', 'createdAt', 'status'] as const;

export const listSubjectsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  cursor: z.string().optional(),
  status: z.enum(SUBJECT_STATUSES).optional(),
  search: z.string().optional(),
  sortBy: z.enum(SUBJECT_SORT_FIELDS).default('createdAt').optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc').optional(),
});

export const subjectIdParamSchema = z.object({
  subjectId: z.uuid('Invalid subject ID format'),
});

export const gradeIdParamSchema = z.object({
  gradeId: z.uuid('Invalid grade ID format'),
});

export const gradeSubjectParamsSchema = z.object({
  gradeId: z.uuid('Invalid grade ID format'),
  subjectId: z.uuid('Invalid subject ID format'),
});

export type AssignOrCreateSubjectInput = z.infer<typeof assignOrCreateSubjectSchema>;
export type CreateSubjectInput = z.infer<typeof createSubjectSchema>;
export type UpdateSubjectInput = z.infer<typeof updateSubjectSchema>;
export type ListSubjectsQuery = z.infer<typeof listSubjectsQuerySchema>;
export type SubjectIdParam = z.infer<typeof subjectIdParamSchema>;
export type GradeIdParam = z.infer<typeof gradeIdParamSchema>;
export type GradeSubjectParams = z.infer<typeof gradeSubjectParamsSchema>;
