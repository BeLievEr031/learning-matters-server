import { z } from 'zod';

export const NOTE_TYPES = [
  'lecture_note',
  'revision_summary',
  'handwritten_note',
  'study_guide',
] as const;

export const createNoteSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  content: z.string().optional(),
  noteType: z.enum(NOTE_TYPES).default('lecture_note'),
  isPublished: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .transform((val) => (typeof val === 'boolean' ? val : val === 'true'))
    .default(true),
  fileUrl: z.string().optional(),
  fileName: z.string().optional(),
  fileSize: z.coerce.number().int().positive().optional(),
  mimeType: z.string().optional(),
});

export const updateNoteSchema = z.object({
  title: z.string().min(1, 'Title cannot be empty').max(255).optional(),
  content: z.string().optional(),
  noteType: z.enum(NOTE_TYPES).optional(),
  isPublished: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .transform((val) => (typeof val === 'boolean' ? val : val === 'true'))
    .optional(),
  fileUrl: z.string().nullable().optional(),
  fileName: z.string().nullable().optional(),
  fileSize: z.coerce.number().int().positive().nullable().optional(),
  mimeType: z.string().nullable().optional(),
});

export const listNotesQuerySchema = z.object({
  noteType: z.enum(NOTE_TYPES).optional(),
  isPublished: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .transform((val) => (typeof val === 'boolean' ? val : val === 'true'))
    .optional(),
  search: z.string().optional(),
});

export const chapterNoteParamsSchema = z.object({
  chapterId: z.uuid('Invalid chapter ID format'),
  noteId: z.uuid('Invalid note ID format'),
});

export const noteIdParamSchema = z.object({
  noteId: z.uuid('Invalid note ID format'),
});

export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
export type ListNotesQuery = z.infer<typeof listNotesQuerySchema>;
export type ChapterNoteParams = z.infer<typeof chapterNoteParamsSchema>;
