import { Router } from 'express';
import { teacherAssignmentsController } from './teacher-assignments.controller.js';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import {
  createTeacherAssignmentSchema,
  updateTeacherAssignmentSchema,
  listTeacherAssignmentsQuerySchema,
  assignmentIdParamSchema,
  teacherIdParamSchema,
  gradeIdParamSchema,
  subjectIdParamSchema,
} from './teacher-assignments.schemas.js';

/**
 * Direct router mounted at /api/v1/teacher-assignments
 */
export const teacherAssignmentsRouter: Router = Router();

// Create assignment (super_admin or own-school admin)
teacherAssignmentsRouter.post(
  '/',
  authenticate,
  authorize('super_admin', 'admin'),
  validate({ body: createTeacherAssignmentSchema }),
  teacherAssignmentsController.createAssignment,
);

// List assignments (super_admin, own-school admin, or principal)
teacherAssignmentsRouter.get(
  '/',
  authenticate,
  authorize('super_admin', 'admin', 'principal'),
  validate({ query: listTeacherAssignmentsQuerySchema }),
  teacherAssignmentsController.listAssignments,
);

// Get assignment by ID (super_admin, own-school admin, principal, class_teacher, or teacher)
teacherAssignmentsRouter.get(
  '/:assignmentId',
  authenticate,
  authorize('super_admin', 'admin', 'principal', 'class_teacher', 'teacher'),
  validate({ params: assignmentIdParamSchema }),
  teacherAssignmentsController.getAssignmentById,
);

// Update assignment status or effective date (super_admin or own-school admin)
teacherAssignmentsRouter.patch(
  '/:assignmentId',
  authenticate,
  authorize('super_admin', 'admin'),
  validate({ params: assignmentIdParamSchema, body: updateTeacherAssignmentSchema }),
  teacherAssignmentsController.updateAssignment,
);

// Delete assignment (super_admin or own-school admin)
teacherAssignmentsRouter.delete(
  '/:assignmentId',
  authenticate,
  authorize('super_admin', 'admin'),
  validate({ params: assignmentIdParamSchema }),
  teacherAssignmentsController.deleteAssignment,
);

/**
 * Sub-resource router mounted at /api/v1/teachers/:teacherId/assignments
 */
export const teacherAssignmentsByTeacherRouter: Router = Router({ mergeParams: true });

teacherAssignmentsByTeacherRouter.get(
  '/',
  authenticate,
  authorize('super_admin', 'admin', 'principal', 'class_teacher', 'teacher'),
  validate({ params: teacherIdParamSchema }),
  teacherAssignmentsController.getAssignmentsByTeacher,
);

/**
 * Sub-resource router mounted at /api/v1/grades/:gradeId/teachers
 */
export const gradeTeachersRouter: Router = Router({ mergeParams: true });

gradeTeachersRouter.get(
  '/',
  authenticate,
  authorize('super_admin', 'admin', 'principal', 'class_teacher', 'teacher'),
  validate({ params: gradeIdParamSchema }),
  teacherAssignmentsController.getTeachersByGrade,
);

/**
 * Sub-resource router mounted at /api/v1/subjects/:subjectId/teachers
 */
export const subjectTeachersRouter: Router = Router({ mergeParams: true });

subjectTeachersRouter.get(
  '/',
  authenticate,
  authorize('super_admin', 'admin', 'principal', 'class_teacher', 'teacher'),
  validate({ params: subjectIdParamSchema }),
  teacherAssignmentsController.getTeachersBySubject,
);
