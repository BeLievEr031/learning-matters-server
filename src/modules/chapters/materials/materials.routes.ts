import { Router } from 'express';
import { materialsController } from './materials.controller.js';
import { validate } from '../../../middleware/validate.js';
import { authenticate } from '../../../middleware/authenticate.js';
import { authorize } from '../../../middleware/authorize.js';
import { handleSingleUpload } from '../../../middleware/upload.js';
import {
  createMaterialSchema,
  listMaterialsQuerySchema,
  chapterIdParamSchema,
  chapterMaterialParamsSchema,
} from './materials.schemas.js';

export const chapterMaterialsRouter: Router = Router({ mergeParams: true });

// Create / upload material under chapter
chapterMaterialsRouter.post(
  '/',
  authenticate,
  authorize('teacher', 'class_teacher', 'admin', 'super_admin'),
  handleSingleUpload('file'),
  validate({ params: chapterIdParamSchema, body: createMaterialSchema }),
  materialsController.createMaterial,
);

// List materials for chapter
chapterMaterialsRouter.get(
  '/',
  authenticate,
  authorize('super_admin', 'admin', 'principal', 'class_teacher', 'teacher', 'student'),
  validate({ params: chapterIdParamSchema, query: listMaterialsQuerySchema }),
  materialsController.listMaterialsByChapter,
);

// Get single material by ID
chapterMaterialsRouter.get(
  '/:materialId',
  authenticate,
  authorize('super_admin', 'admin', 'principal', 'class_teacher', 'teacher', 'student'),
  validate({ params: chapterMaterialParamsSchema }),
  materialsController.getMaterialById,
);

// Soft-delete material
chapterMaterialsRouter.delete(
  '/:materialId',
  authenticate,
  authorize('super_admin', 'admin', 'principal', 'teacher', 'class_teacher'),
  validate({ params: chapterMaterialParamsSchema }),
  materialsController.deleteMaterial,
);
