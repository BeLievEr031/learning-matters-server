import { eq, isNull, and, desc, ilike } from 'drizzle-orm';
import { db } from '../../../db/pool.js';
import {
  chapterMaterials,
  type ChapterMaterial,
  type MaterialType,
} from '../../../db/schema/chapter-materials.js';

export interface CreateChapterMaterialData {
  schoolId: string;
  chapterId: string;
  subjectId: string;
  teacherId: string;
  title: string;
  description?: string | null | undefined;
  materialType: MaterialType;
  fileUrl?: string | null | undefined;
  fileName?: string | null | undefined;
  fileSize?: number | null | undefined;
  mimeType?: string | null | undefined;
  externalUrl?: string | null | undefined;
}

export interface ListMaterialsFilters {
  materialType?: MaterialType | undefined;
  search?: string | undefined;
}

export class MaterialsRepository {
  async create(data: CreateChapterMaterialData): Promise<ChapterMaterial> {
    const rows = await db
      .insert(chapterMaterials)
      .values({
        schoolId: data.schoolId,
        chapterId: data.chapterId,
        subjectId: data.subjectId,
        teacherId: data.teacherId,
        title: data.title.trim(),
        description: data.description?.trim() ?? null,
        materialType: data.materialType,
        fileUrl: data.fileUrl ?? null,
        fileName: data.fileName ?? null,
        fileSize: data.fileSize ?? null,
        mimeType: data.mimeType ?? null,
        externalUrl: data.externalUrl?.trim() ?? null,
      })
      .returning();

    const created = rows[0];
    if (!created) {
      throw new Error('Failed to create chapter material');
    }
    return created;
  }

  async findById(id: string, includeDeleted = false): Promise<ChapterMaterial | null> {
    const conditions = [eq(chapterMaterials.id, id)];
    if (!includeDeleted) {
      conditions.push(isNull(chapterMaterials.deletedAt));
    }

    const rows = await db
      .select()
      .from(chapterMaterials)
      .where(and(...conditions))
      .limit(1);

    return rows[0] ?? null;
  }

  async listByChapter(
    chapterId: string,
    filters?: ListMaterialsFilters,
  ): Promise<ChapterMaterial[]> {
    const conditions = [
      eq(chapterMaterials.chapterId, chapterId),
      isNull(chapterMaterials.deletedAt),
    ];

    if (filters?.materialType) {
      conditions.push(eq(chapterMaterials.materialType, filters.materialType));
    }

    if (filters?.search) {
      const searchPattern = `%${filters.search.trim()}%`;
      conditions.push(ilike(chapterMaterials.title, searchPattern));
    }

    return db
      .select()
      .from(chapterMaterials)
      .where(and(...conditions))
      .orderBy(desc(chapterMaterials.createdAt));
  }

  async softDelete(id: string): Promise<boolean> {
    const rows = await db
      .update(chapterMaterials)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(chapterMaterials.id, id), isNull(chapterMaterials.deletedAt)))
      .returning({ id: chapterMaterials.id });

    return rows.length > 0;
  }
}

export const materialsRepository = new MaterialsRepository();
