import { z } from 'zod';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../../config/constants.js';

export const BOARD_STATUSES = ['active', 'inactive', 'archived'] as const;

export const createBoardSchema = z.object({
  name: z.string().min(1, 'Board name is required').max(255),
  code: z.string().min(1, 'Board code is required').max(50),
  description: z.string().max(1000).optional(),
  status: z.enum(BOARD_STATUSES).default('active'),
});

export const updateBoardSchema = z.object({
  name: z.string().min(1, 'Board name cannot be empty').max(255).optional(),
  code: z.string().min(1, 'Board code cannot be empty').max(50).optional(),
  description: z.string().max(1000).nullable().optional(),
  status: z.enum(BOARD_STATUSES).optional(),
});

export const listBoardsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  cursor: z.string().optional(),
  status: z.enum(BOARD_STATUSES).optional(),
  search: z.string().optional(),
});

export const boardIdParamSchema = z.object({
  boardId: z.uuid('Invalid board ID format'),
});

export const schoolIdParamSchema = z.object({
  schoolId: z.uuid('Invalid school ID format'),
});

export type CreateBoardInput = z.infer<typeof createBoardSchema>;
export type UpdateBoardInput = z.infer<typeof updateBoardSchema>;
export type ListBoardsQuery = z.infer<typeof listBoardsQuerySchema>;
export type BoardIdParam = z.infer<typeof boardIdParamSchema>;
export type SchoolIdParam = z.infer<typeof schoolIdParamSchema>;
