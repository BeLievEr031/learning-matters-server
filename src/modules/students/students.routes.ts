import { Router } from 'express';
import { studentsController } from './students.controller.js';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import {
  createStudentSchema,
  updateStudentSchema,
  transferStudentSchema,
  listStudentsQuerySchema,
  studentIdParamSchema,
  gradeIdParamSchema,
} from './students.schemas.js';

/**
 * Sub-resource router mounted at /api/v1/grades/:gradeId/students
 */
export const gradeStudentsRouter: Router = Router({ mergeParams: true });

// Create student under grade (super_admin or own-school admin)
gradeStudentsRouter.post(
  '/',
  authenticate,
  authorize('super_admin', 'admin'),
  validate({ params: gradeIdParamSchema, body: createStudentSchema }),
  studentsController.createStudent,
);

// List students in grade (super_admin, own-school admin, principal, or class_teacher)
gradeStudentsRouter.get(
  '/',
  authenticate,
  authorize('super_admin', 'admin', 'principal', 'class_teacher'),
  validate({ params: gradeIdParamSchema, query: listStudentsQuerySchema }),
  studentsController.listStudentsByGrade,
);

/**
 * Direct router mounted at /api/v1/students
 */
export const studentsRouter: Router = Router();

// Get student by ID (super_admin, school staff, or student themselves)
studentsRouter.get(
  '/:studentId',
  authenticate,
  authorize('super_admin', 'admin', 'principal', 'class_teacher', 'teacher', 'student'),
  validate({ params: studentIdParamSchema }),
  studentsController.getStudentById,
);

// Update student profile (super_admin or own-school admin)
studentsRouter.patch(
  '/:studentId',
  authenticate,
  authorize('super_admin', 'admin'),
  validate({ params: studentIdParamSchema, body: updateStudentSchema }),
  studentsController.updateStudent,
);

// Transfer student to another grade (super_admin or own-school admin)
studentsRouter.patch(
  '/:studentId/transfer',
  authenticate,
  authorize('super_admin', 'admin'),
  validate({ params: studentIdParamSchema, body: transferStudentSchema }),
  studentsController.transferStudent,
);

// Soft-delete student (super_admin or own-school admin)
studentsRouter.delete(
  '/:studentId',
  authenticate,
  authorize('super_admin', 'admin'),
  validate({ params: studentIdParamSchema }),
  studentsController.deleteStudent,
);
