import { Router } from 'express';
import { teachersController } from './teachers.controller.js';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import {
  createTeacherSchema,
  updateTeacherSchema,
  listTeachersQuerySchema,
  teacherIdParamSchema,
  schoolIdParamSchema,
} from './teachers.schemas.js';

/**
 * Sub-resource router mounted at /api/v1/schools/:schoolId/teachers
 */
export const schoolTeachersRouter: Router = Router({ mergeParams: true });

// Create teacher under school (super_admin or own-school admin)
schoolTeachersRouter.post(
  '/',
  authenticate,
  authorize('super_admin', 'admin'),
  validate({ params: schoolIdParamSchema, body: createTeacherSchema }),
  teachersController.createTeacher,
);

// List teachers under school (super_admin, own-school admin, or principal)
schoolTeachersRouter.get(
  '/',
  authenticate,
  authorize('super_admin', 'admin', 'principal'),
  validate({ params: schoolIdParamSchema, query: listTeachersQuerySchema }),
  teachersController.listTeachersBySchool,
);

/**
 * Direct router mounted at /api/v1/teachers
 */
export const teachersRouter: Router = Router();

// Get teacher by ID (super_admin, same-school staff, or teacher themselves)
teachersRouter.get(
  '/:teacherId',
  authenticate,
  authorize('super_admin', 'admin', 'principal', 'class_teacher', 'teacher'),
  validate({ params: teacherIdParamSchema }),
  teachersController.getTeacherById,
);

// Update teacher (super_admin or own-school admin)
teachersRouter.patch(
  '/:teacherId',
  authenticate,
  authorize('super_admin', 'admin'),
  validate({ params: teacherIdParamSchema, body: updateTeacherSchema }),
  teachersController.updateTeacher,
);

// Soft-delete teacher (super_admin or own-school admin)
teachersRouter.delete(
  '/:teacherId',
  authenticate,
  authorize('super_admin', 'admin'),
  validate({ params: teacherIdParamSchema }),
  teachersController.deleteTeacher,
);
