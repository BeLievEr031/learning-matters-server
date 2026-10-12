import { Router } from 'express';
import { chaptersController } from './chapters.controller.js';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import {
  createChapterSchema,
  updateChapterSchema,
  reorderChaptersSchema,
  listChaptersQuerySchema,
  subjectIdParamSchema,
  chapterIdParamSchema,
  subjectChapterParamsSchema,
} from './chapters.schemas.js';

/**
 * Router mounted at /api/v1/subjects/:subjectId/chapters
 */
export const subjectChaptersRouter: Router = Router({ mergeParams: true });

// Create chapter under subject (super_admin or own-school admin)
subjectChaptersRouter.post(
  '/',
  authenticate,
  authorize('super_admin', 'admin'),
  validate({ params: subjectIdParamSchema, body: createChapterSchema }),
  chaptersController.createChapter,
);

// List chapters for subject (super_admin, admin, principal, class_teacher, teacher, student)
subjectChaptersRouter.get(
  '/',
  authenticate,
  authorize('super_admin', 'admin', 'principal', 'class_teacher', 'teacher', 'student'),
  validate({ params: subjectIdParamSchema, query: listChaptersQuerySchema }),
  chaptersController.listChaptersBySubject,
);

// Reorder chapters within subject (super_admin or own-school admin)
subjectChaptersRouter.patch(
  '/reorder',
  authenticate,
  authorize('super_admin', 'admin'),
  validate({ params: subjectIdParamSchema, body: reorderChaptersSchema }),
  chaptersController.reorderChapters,
);

// Nested routes for specific chapter under a subject
subjectChaptersRouter.get(
  '/:chapterId',
  authenticate,
  authorize('super_admin', 'admin', 'principal', 'class_teacher', 'teacher', 'student'),
  validate({ params: subjectChapterParamsSchema }),
  chaptersController.getChapterById,
);

subjectChaptersRouter.patch(
  '/:chapterId',
  authenticate,
  authorize('super_admin', 'admin'),
  validate({ params: subjectChapterParamsSchema, body: updateChapterSchema }),
  chaptersController.updateChapter,
);

subjectChaptersRouter.delete(
  '/:chapterId',
  authenticate,
  authorize('super_admin', 'admin'),
  validate({ params: subjectChapterParamsSchema }),
  chaptersController.deleteChapter,
);

/**
 * Router mounted at /api/v1/chapters
 */
export const chaptersRouter: Router = Router();

// Get chapter by ID (super_admin, admin, principal, class_teacher, teacher, student)
chaptersRouter.get(
  '/:chapterId',
  authenticate,
  authorize('super_admin', 'admin', 'principal', 'class_teacher', 'teacher', 'student'),
  validate({ params: chapterIdParamSchema }),
  chaptersController.getChapterById,
);

// Update chapter (super_admin or own-school admin)
chaptersRouter.patch(
  '/:chapterId',
  authenticate,
  authorize('super_admin', 'admin'),
  validate({ params: chapterIdParamSchema, body: updateChapterSchema }),
  chaptersController.updateChapter,
);

// Soft delete chapter (super_admin or own-school admin)
chaptersRouter.delete(
  '/:chapterId',
  authenticate,
  authorize('super_admin', 'admin'),
  validate({ params: chapterIdParamSchema }),
  chaptersController.deleteChapter,
);
