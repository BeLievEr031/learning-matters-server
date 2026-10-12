import { chaptersRepository, type ChaptersRepository } from './chapters.repository.js';
import { subjectsRepository, type SubjectsRepository } from '../subjects/subjects.repository.js';
import type { Chapter } from '../../db/schema/chapters.js';
import type { Subject } from '../../db/schema/subjects.js';
import type {
  CreateChapterInput,
  UpdateChapterInput,
  ListChaptersQuery,
  ReorderChaptersInput,
} from './chapters.schemas.js';
import type { UserRole } from '../../db/schema/users.js';
import {
  NotFoundError,
  ConflictError,
  ForbiddenError,
  BadRequestError,
} from '../../lib/app-error.js';
import { DEFAULT_PAGE_SIZE } from '../../config/constants.js';
import {
  decodeCursor,
  buildPaginatedResponse,
  type PaginatedResult,
} from '../../lib/pagination.js';

export class ChaptersService {
  constructor(
    private readonly repo: ChaptersRepository = chaptersRepository,
    private readonly subjectsRepo: SubjectsRepository = subjectsRepository,
  ) {}

  /**
   * Verify subject exists and caller has school-scoped access.
   */
  private async getAndVerifySubjectAccess(
    subjectId: string,
    callerSchoolId?: string | null,
    callerRole?: UserRole,
  ): Promise<Subject> {
    const subject = await this.subjectsRepo.findById(subjectId);
    if (!subject) {
      throw new NotFoundError('Subject not found');
    }

    if (callerRole && callerRole !== 'super_admin') {
      if (!callerSchoolId || subject.schoolId !== callerSchoolId) {
        throw new ForbiddenError('Forbidden: Access to this subject is not allowed');
      }
    }

    return subject;
  }

  /**
   * Verify chapter exists and caller has school-scoped access.
   */
  private async getAndVerifyChapterAccess(
    chapterId: string,
    callerSchoolId?: string | null,
    callerRole?: UserRole,
  ): Promise<Chapter> {
    const chapter = await this.repo.findById(chapterId);
    if (!chapter) {
      throw new NotFoundError('Chapter not found');
    }

    if (callerRole && callerRole !== 'super_admin') {
      if (!callerSchoolId || chapter.schoolId !== callerSchoolId) {
        throw new ForbiddenError('Forbidden: Access to this chapter is not allowed');
      }
    }

    return chapter;
  }

  /**
   * Create a new chapter under a subject.
   */
  async createChapter(
    subjectId: string,
    input: CreateChapterInput,
    callerSchoolId?: string | null,
    callerRole?: UserRole,
  ): Promise<Chapter> {
    const subject = await this.getAndVerifySubjectAccess(subjectId, callerSchoolId, callerRole);

    if (subject.status !== 'active') {
      throw new BadRequestError('Cannot add chapters to an inactive or archived subject');
    }

    const existing = await this.repo.findBySubjectAndNumber(subjectId, input.chapterNumber);
    if (existing) {
      throw new ConflictError(
        `Chapter number ${String(input.chapterNumber)} already exists in this subject`,
      );
    }

    return await this.repo.create({
      schoolId: subject.schoolId,
      subjectId: subject.id,
      chapterNumber: input.chapterNumber,
      title: input.title,
      description: input.description,
      status: input.status,
    });
  }

  /**
   * List chapters under a subject with cursor-based pagination.
   */
  async listChaptersBySubject(
    subjectId: string,
    query: Partial<ListChaptersQuery> = {},
    callerSchoolId?: string | null,
    callerRole?: UserRole,
  ): Promise<PaginatedResult<Chapter>> {
    await this.getAndVerifySubjectAccess(subjectId, callerSchoolId, callerRole);

    const limit = query.limit ?? DEFAULT_PAGE_SIZE;
    const cursor = query.cursor ? decodeCursor(query.cursor) : undefined;
    const rawItems = await this.repo.listBySubject(subjectId, limit, cursor ?? undefined, {
      status: query.status,
      search: query.search,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });

    return buildPaginatedResponse(rawItems, limit, (item) => ({
      createdAt: item.createdAt,
      id: item.id,
    }));
  }

  /**
   * Get single chapter details by ID.
   */
  async getChapterById(
    chapterId: string,
    callerSchoolId?: string | null,
    callerRole?: UserRole,
  ): Promise<Chapter> {
    return await this.getAndVerifyChapterAccess(chapterId, callerSchoolId, callerRole);
  }

  /**
   * Update chapter details.
   */
  async updateChapter(
    chapterId: string,
    input: UpdateChapterInput,
    callerSchoolId?: string | null,
    callerRole?: UserRole,
  ): Promise<Chapter> {
    const chapter = await this.getAndVerifyChapterAccess(chapterId, callerSchoolId, callerRole);

    if (input.chapterNumber !== undefined && input.chapterNumber !== chapter.chapterNumber) {
      const existing = await this.repo.findBySubjectAndNumber(
        chapter.subjectId,
        input.chapterNumber,
      );
      if (existing && existing.id !== chapterId) {
        throw new ConflictError(
          `Chapter number ${String(input.chapterNumber)} already exists in this subject`,
        );
      }
    }

    const updated = await this.repo.update(chapterId, input);
    if (!updated) {
      throw new NotFoundError('Chapter not found');
    }
    return updated;
  }

  /**
   * Soft delete a chapter.
   */
  async deleteChapter(
    chapterId: string,
    callerSchoolId?: string | null,
    callerRole?: UserRole,
  ): Promise<void> {
    await this.getAndVerifyChapterAccess(chapterId, callerSchoolId, callerRole);
    const deleted = await this.repo.softDelete(chapterId);
    if (!deleted) {
      throw new NotFoundError('Chapter not found');
    }
  }

  /**
   * Reorder chapters within a subject.
   */
  async reorderChapters(
    subjectId: string,
    input: ReorderChaptersInput,
    callerSchoolId?: string | null,
    callerRole?: UserRole,
  ): Promise<Chapter[]> {
    await this.getAndVerifySubjectAccess(subjectId, callerSchoolId, callerRole);

    // Verify all chapters belong to this subject and are not deleted
    for (const item of input.chapters) {
      const chapter = await this.repo.findById(item.id);
      if (chapter?.subjectId !== subjectId) {
        throw new NotFoundError(`Chapter ${item.id} not found under this subject`);
      }
    }

    return await this.repo.reorder(subjectId, input.chapters);
  }
}

export const chaptersService = new ChaptersService();
