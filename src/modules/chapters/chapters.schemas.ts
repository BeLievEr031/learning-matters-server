import { z } from 'zod';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../../config/constants.js';

export const CHAPTER_STATUSES = ['active', 'inactive', 'archived'] as const;

export const createChapterSchema = z.object({
  chapterNumber: z
    .number()
    .int('Chapter number must be an integer')
    .positive('Chapter number must be positive'),
  title: z.string().trim().min(1, 'Chapter title is required').max(255),
  description: z.string().trim().max(2000).optional(),
  status: z.enum(CHAPTER_STATUSES).default('active'),
});

export const updateChapterSchema = z.object({
  chapterNumber: z
    .number()
    .int('Chapter number must be an integer')
    .positive('Chapter number must be positive')
    .optional(),
  title: z.string().trim().min(1, 'Chapter title cannot be empty').max(255).optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  status: z.enum(CHAPTER_STATUSES).optional(),
});

export const reorderChapterItemSchema = z.object({
  id: z.uuid('Invalid chapter ID format'),
  chapterNumber: z
    .number()
    .int('Chapter number must be an integer')
    .positive('Chapter number must be positive'),
});

export const reorderChaptersSchema = z.object({
  chapters: z
    .array(reorderChapterItemSchema)
    .min(1, 'At least one chapter must be specified')
    .refine((items) => {
      const numbers = items.map((i) => i.chapterNumber);
      return new Set(numbers).size === numbers.length;
    }, 'Duplicate chapter numbers in reorder payload')
    .refine((items) => {
      const ids = items.map((i) => i.id);
      return new Set(ids).size === ids.length;
    }, 'Duplicate chapter IDs in reorder payload'),
});

export const CHAPTER_SORT_FIELDS = ['chapterNumber', 'title', 'createdAt', 'status'] as const;

export const listChaptersQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  cursor: z.string().optional(),
  status: z.enum(CHAPTER_STATUSES).optional(),
  search: z.string().optional(),
  sortBy: z.enum(CHAPTER_SORT_FIELDS).default('chapterNumber').optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc').optional(),
});

export const subjectIdParamSchema = z.object({
  subjectId: z.uuid('Invalid subject ID format'),
});

export const chapterIdParamSchema = z.object({
  chapterId: z.uuid('Invalid chapter ID format'),
});

export const subjectChapterParamsSchema = z.object({
  subjectId: z.uuid('Invalid subject ID format'),
  chapterId: z.uuid('Invalid chapter ID format'),
});

export type CreateChapterInput = z.infer<typeof createChapterSchema>;
export type UpdateChapterInput = z.infer<typeof updateChapterSchema>;
export type ReorderChaptersInput = z.infer<typeof reorderChaptersSchema>;
export type ListChaptersQuery = z.infer<typeof listChaptersQuerySchema>;
export type SubjectIdParam = z.infer<typeof subjectIdParamSchema>;
export type ChapterIdParam = z.infer<typeof chapterIdParamSchema>;
export type SubjectChapterParams = z.infer<typeof subjectChapterParamsSchema>;
