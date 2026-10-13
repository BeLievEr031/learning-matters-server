import {
  materialsRepository,
  type MaterialsRepository,
  type ListMaterialsFilters,
} from './materials.repository.js';
import { chaptersRepository, type ChaptersRepository } from '../chapters.repository.js';
import { teachersRepository, type TeachersRepository } from '../../teachers/teachers.repository.js';
import type { ChapterMaterial } from '../../../db/schema/chapter-materials.js';
import type { CreateMaterialInput } from './materials.schemas.js';
import type { UserRole } from '../../../db/schema/users.js';
import { NotFoundError, ForbiddenError, BadRequestError } from '../../../lib/app-error.js';

export class MaterialsService {
  constructor(
    private readonly repo: MaterialsRepository = materialsRepository,
    private readonly chaptersRepo: ChaptersRepository = chaptersRepository,
    private readonly teachersRepo: TeachersRepository = teachersRepository,
  ) {}

  async createMaterial(
    chapterId: string,
    input: CreateMaterialInput,
    file?: Express.Multer.File,
    callerUserId?: string,
    callerSchoolId?: string | null,
    callerRole?: UserRole,
  ): Promise<ChapterMaterial> {
    const chapter = await this.chaptersRepo.findById(chapterId);
    if (!chapter) {
      throw new NotFoundError('Chapter not found');
    }

    if (callerRole !== 'super_admin' && chapter.schoolId !== callerSchoolId) {
      throw new ForbiddenError('Forbidden: Cannot add materials to chapters in another school');
    }

    let teacherId: string | null = null;
    if (callerRole === 'teacher' || callerRole === 'class_teacher') {
      if (!callerUserId) {
        throw new ForbiddenError('Teacher user ID is required');
      }
      const teacher = await this.teachersRepo.findByUserId(callerUserId);
      if (!teacher) {
        throw new NotFoundError('Teacher profile not found for this account');
      }

      const hasAssignment = await this.teachersRepo.hasTeacherSubjectAssignment(
        teacher.id,
        chapter.subjectId,
      );
      if (!hasAssignment) {
        throw new ForbiddenError(
          'Forbidden: You are not assigned to teach the subject of this chapter',
        );
      }
      teacherId = teacher.id;
    } else {
      // For admin / super_admin
      if (callerUserId) {
        const teacher = await this.teachersRepo.findByUserId(callerUserId);
        if (teacher) {
          teacherId = teacher.id;
        }
      }
      if (!teacherId) {
        // Fallback: lookup any active teacher for this school
        const fallbackTeachers = await this.teachersRepo.listBySchool(chapter.schoolId, 1);
        const fallbackTeacher = fallbackTeachers[0];
        if (!fallbackTeacher) {
          throw new BadRequestError('No teacher profile found to attribute material upload');
        }
        teacherId = fallbackTeacher.id;
      }
    }

    let fileUrl = input.fileUrl ?? null;
    let fileName = input.fileName ?? null;
    let fileSize = input.fileSize ?? null;
    let mimeType = input.mimeType ?? null;

    if (file) {
      fileUrl = `/uploads/${file.filename}`;
      fileName = file.originalname;
      fileSize = file.size;
      mimeType = file.mimetype;
    }

    if (
      (input.materialType === 'document' ||
        input.materialType === 'worksheet' ||
        input.materialType === 'presentation') &&
      !fileUrl
    ) {
      throw new BadRequestError('A file attachment or fileUrl is required for this material type');
    }

    return this.repo.create({
      schoolId: chapter.schoolId,
      chapterId: chapter.id,
      subjectId: chapter.subjectId,
      teacherId,
      title: input.title,
      description: input.description ?? null,
      materialType: input.materialType,
      fileUrl,
      fileName,
      fileSize,
      mimeType,
      externalUrl: input.externalUrl ?? null,
    });
  }

  async listMaterialsByChapter(
    chapterId: string,
    filters?: ListMaterialsFilters,
    callerSchoolId?: string | null,
    callerRole?: UserRole,
  ): Promise<ChapterMaterial[]> {
    const chapter = await this.chaptersRepo.findById(chapterId);
    if (!chapter) {
      throw new NotFoundError('Chapter not found');
    }

    if (callerRole !== 'super_admin' && chapter.schoolId !== callerSchoolId) {
      throw new ForbiddenError('Forbidden: Cannot access materials from another school');
    }

    return this.repo.listByChapter(chapterId, filters);
  }

  async getMaterialById(
    chapterId: string,
    materialId: string,
    callerSchoolId?: string | null,
    callerRole?: UserRole,
  ): Promise<ChapterMaterial> {
    const chapter = await this.chaptersRepo.findById(chapterId);
    if (!chapter) {
      throw new NotFoundError('Chapter not found');
    }

    if (callerRole !== 'super_admin' && chapter.schoolId !== callerSchoolId) {
      throw new ForbiddenError('Forbidden: Cannot access materials from another school');
    }

    const material = await this.repo.findById(materialId);
    if (material?.chapterId !== chapterId) {
      throw new NotFoundError('Material not found');
    }

    return material;
  }

  async deleteMaterial(
    chapterId: string,
    materialId: string,
    callerUserId?: string,
    callerSchoolId?: string | null,
    callerRole?: UserRole,
  ): Promise<void> {
    const chapter = await this.chaptersRepo.findById(chapterId);
    if (!chapter) {
      throw new NotFoundError('Chapter not found');
    }

    if (callerRole !== 'super_admin' && chapter.schoolId !== callerSchoolId) {
      throw new ForbiddenError('Forbidden: Cannot delete materials from another school');
    }

    const material = await this.repo.findById(materialId);
    if (material?.chapterId !== chapterId) {
      throw new NotFoundError('Material not found');
    }

    if (callerRole === 'teacher' || callerRole === 'class_teacher') {
      if (!callerUserId) {
        throw new ForbiddenError('Teacher user ID is required');
      }
      const teacher = await this.teachersRepo.findByUserId(callerUserId);
      if (material.teacherId !== teacher?.id) {
        throw new ForbiddenError('Forbidden: You can only delete materials that you uploaded');
      }
    }

    await this.repo.softDelete(materialId);
  }
}

export const materialsService = new MaterialsService();
