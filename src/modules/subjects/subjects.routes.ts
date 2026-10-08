import { Router } from 'express';
import { subjectsController } from './subjects.controller.js';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import {
  assignOrCreateSubjectSchema,
  updateSubjectSchema,
  listSubjectsQuerySchema,
  subjectIdParamSchema,
  gradeIdParamSchema,
  gradeSubjectParamsSchema,
} from './subjects.schemas.js';

/**
 * Router mounted at /api/v1/grades/:gradeId/subjects
 */
export const gradeSubjectsRouter: Router = Router({ mergeParams: true });

// Assign or create subject under grade (super_admin or own-school admin)
gradeSubjectsRouter.post(
  '/',
  authenticate,
  authorize('super_admin', 'admin'),
  validate({ params: gradeIdParamSchema, body: assignOrCreateSubjectSchema }),
  subjectsController.assignOrCreateSubject,
);

// List subjects associated with grade (super_admin, admin, principal, class_teacher, or teacher)
gradeSubjectsRouter.get(
  '/',
  authenticate,
  authorize('super_admin', 'admin', 'principal', 'class_teacher', 'teacher'),
  validate({ params: gradeIdParamSchema, query: listSubjectsQuerySchema }),
  subjectsController.listSubjectsByGrade,
);

// Remove subject association from grade (super_admin or own-school admin)
gradeSubjectsRouter.delete(
  '/:subjectId',
  authenticate,
  authorize('super_admin', 'admin'),
  validate({ params: gradeSubjectParamsSchema }),
  subjectsController.removeGradeAssignment,
);

import { subjectTeachersRouter } from '../teacher-assignments/teacher-assignments.routes.js';

/**
 * Router mounted at /api/v1/subjects
 */
export const subjectsRouter: Router = Router();

// Sub-resource router for subject teachers
subjectsRouter.use('/:subjectId/teachers', subjectTeachersRouter);

// Get master subject by ID (super_admin, admin, principal, class_teacher, or teacher)
subjectsRouter.get(
  '/:subjectId',
  authenticate,
  authorize('super_admin', 'admin', 'principal', 'class_teacher', 'teacher'),
  validate({ params: subjectIdParamSchema }),
  subjectsController.getSubjectById,
);

// Update master subject (super_admin or own-school admin)
subjectsRouter.patch(
  '/:subjectId',
  authenticate,
  authorize('super_admin', 'admin'),
  validate({ params: subjectIdParamSchema, body: updateSubjectSchema }),
  subjectsController.updateSubject,
);

// Soft-delete master subject and cascade grade associations (super_admin or own-school admin)
subjectsRouter.delete(
  '/:subjectId',
  authenticate,
  authorize('super_admin', 'admin'),
  validate({ params: subjectIdParamSchema }),
  subjectsController.deleteSubject,
);
