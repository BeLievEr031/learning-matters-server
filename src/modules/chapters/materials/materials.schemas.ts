import { z } from 'zod';

export const MATERIAL_TYPES = [
  'document',
  'worksheet',
  'presentation',
  'video_link',
  'reference_link',
] as const;

export const createMaterialSchema = z
  .object({
    title: z.string().min(1, 'Title is required').max(255),
    description: z.string().max(2000).optional(),
    materialType: z.enum(MATERIAL_TYPES).default('document'),
    externalUrl: z.url({ message: 'Invalid external URL' }).optional().or(z.literal('')),
    fileUrl: z.string().optional(),
    fileName: z.string().optional(),
    fileSize: z.coerce.number().int().positive().optional(),
    mimeType: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.materialType === 'video_link' || data.materialType === 'reference_link') {
        return Boolean(data.externalUrl && data.externalUrl.trim().length > 0);
      }
      return true;
    },
    {
      message: 'externalUrl is required for video_link and reference_link material types',
      path: ['externalUrl'],
    },
  );

export const listMaterialsQuerySchema = z.object({
  materialType: z.enum(MATERIAL_TYPES).optional(),
  search: z.string().optional(),
});

export const chapterIdParamSchema = z.object({
  chapterId: z.uuid('Invalid chapter ID format'),
});

export const materialIdParamSchema = z.object({
  materialId: z.uuid('Invalid material ID format'),
});

export const chapterMaterialParamsSchema = z.object({
  chapterId: z.uuid('Invalid chapter ID format'),
  materialId: z.uuid('Invalid material ID format'),
});

export type CreateMaterialInput = z.infer<typeof createMaterialSchema>;
export type ListMaterialsQuery = z.infer<typeof listMaterialsQuerySchema>;
export type ChapterIdParam = z.infer<typeof chapterIdParamSchema>;
export type MaterialIdParam = z.infer<typeof materialIdParamSchema>;
export type ChapterMaterialParams = z.infer<typeof chapterMaterialParamsSchema>;
