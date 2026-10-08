import { Router } from 'express';
import { gradesController } from './grades.controller.js';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import {
  createGradeSchema,
  updateGradeSchema,
  listGradesQuerySchema,
  gradeIdParamSchema,
  boardIdParamSchema,
} from './grades.schemas.js';

/**
 * Router mounted at /api/v1/boards/:boardId/grades
 */
export const boardGradesRouter: Router = Router({ mergeParams: true });

// Create grade under a board (super_admin or own-school admin)
boardGradesRouter.post(
  '/',
  authenticate,
  authorize('super_admin', 'admin'),
  validate({ params: boardIdParamSchema, body: createGradeSchema }),
  gradesController.createGrade,
);

// List grades under a board (super_admin, admin, principal, or class_teacher of own school)
boardGradesRouter.get(
  '/',
  authenticate,
  authorize('super_admin', 'admin', 'principal', 'class_teacher'),
  validate({ params: boardIdParamSchema, query: listGradesQuerySchema }),
  gradesController.listGrades,
);

import { gradeSubjectsRouter } from '../subjects/subjects.routes.js';
import { gradeStudentsRouter } from '../students/students.routes.js';
import { gradeTeachersRouter } from '../teacher-assignments/teacher-assignments.routes.js';

/**
 * Router mounted at /api/v1/grades
 */
export const gradesRouter: Router = Router();

// Sub-resource routers
gradesRouter.use('/:gradeId/subjects', gradeSubjectsRouter);
gradesRouter.use('/:gradeId/students', gradeStudentsRouter);
gradesRouter.use('/:gradeId/teachers', gradeTeachersRouter);

// Get grade by ID (super_admin or scoped admin/principal/class_teacher)
gradesRouter.get(
  '/:gradeId',
  authenticate,
  authorize('super_admin', 'admin', 'principal', 'class_teacher'),
  validate({ params: gradeIdParamSchema }),
  gradesController.getGradeById,
);

// Update grade (super_admin or own-school admin)
gradesRouter.patch(
  '/:gradeId',
  authenticate,
  authorize('super_admin', 'admin'),
  validate({ params: gradeIdParamSchema, body: updateGradeSchema }),
  gradesController.updateGrade,
);

// Delete grade (super_admin or own-school admin, soft-delete)
gradesRouter.delete(
  '/:gradeId',
  authenticate,
  authorize('super_admin', 'admin'),
  validate({ params: gradeIdParamSchema }),
  gradesController.deleteGrade,
);
