import { z } from 'zod';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../../config/constants.js';

export const GRADE_STATUSES = ['active', 'inactive', 'archived'] as const;

export const createGradeSchema = z.object({
  name: z.string().min(1, 'Grade name is required').max(255),
  code: z.string().min(1, 'Grade code is required').max(50),
  gradeNumber: z.number().int().min(0, 'Grade number must be a non-negative integer'),
  section: z.string().max(50).nullable().optional(),
  capacity: z.number().int().min(1, 'Capacity must be at least 1').nullable().optional(),
  status: z.enum(GRADE_STATUSES).default('active'),
});

export const updateGradeSchema = z.object({
  name: z.string().min(1, 'Grade name cannot be empty').max(255).optional(),
  code: z.string().min(1, 'Grade code cannot be empty').max(50).optional(),
  gradeNumber: z.number().int().min(0, 'Grade number must be a non-negative integer').optional(),
  section: z.string().max(50).nullable().optional(),
  capacity: z.number().int().min(1, 'Capacity must be at least 1').nullable().optional(),
  status: z.enum(GRADE_STATUSES).optional(),
});

export const GRADE_SORT_FIELDS = ['name', 'code', 'gradeNumber', 'createdAt', 'status'] as const;

export const listGradesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  cursor: z.string().optional(),
  status: z.enum(GRADE_STATUSES).optional(),
  section: z.string().optional(),
  gradeNumber: z.coerce.number().int().optional(),
  search: z.string().optional(),
  sortBy: z.enum(GRADE_SORT_FIELDS).default('createdAt').optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc').optional(),
});

export const gradeIdParamSchema = z.object({
  gradeId: z.uuid('Invalid grade ID format'),
});

export const assignClassTeacherSchema = z.object({
  teacherId: z.uuid('Invalid teacher ID format').nullable(),
});

export const boardIdParamSchema = z.object({
  boardId: z.uuid('Invalid board ID format'),
});

export type CreateGradeInput = z.infer<typeof createGradeSchema>;
export type UpdateGradeInput = z.infer<typeof updateGradeSchema>;
export type ListGradesQuery = z.infer<typeof listGradesQuerySchema>;
export type GradeIdParam = z.infer<typeof gradeIdParamSchema>;
export type BoardIdParam = z.infer<typeof boardIdParamSchema>;
export type AssignClassTeacherInput = z.infer<typeof assignClassTeacherSchema>;
