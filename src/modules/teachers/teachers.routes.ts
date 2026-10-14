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
  gradeIdParamSchema,
  subjectIdParamSchema,
} from './teachers.schemas.js';
import { listStudentsQuerySchema } from '../students/students.schemas.js';

/**
 * Sub-resource router mounted at /api/v1/schools/:schoolId/teachers
 */
export const schoolTeachersRouter: Router = Router({ mergeParams: true });

// Create teacher under school (super_admin, own-school admin, or principal)
schoolTeachersRouter.post(
  '/',
  authenticate,
  authorize('super_admin', 'admin', 'principal'),
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

import { teacherAssignmentsByTeacherRouter } from '../teacher-assignments/teacher-assignments.routes.js';

/**
 * Direct router mounted at /api/v1/teachers
 */
export const teachersRouter: Router = Router();

// Sub-resource router for teacher assignments
teachersRouter.use('/:teacherId/assignments', teacherAssignmentsByTeacherRouter);

// Teacher context routes (must precede /:teacherId)
teachersRouter.get(
  '/me/grades',
  authenticate,
  authorize('teacher', 'class_teacher'),
  teachersController.getMyAssignedGrades,
);

teachersRouter.get(
  '/me/subjects',
  authenticate,
  authorize('teacher', 'class_teacher'),
  teachersController.getMyAllAssignedSubjects,
);

teachersRouter.get(
  '/me/grades/:gradeId/subjects',
  authenticate,
  authorize('teacher', 'class_teacher'),
  validate({ params: gradeIdParamSchema }),
  teachersController.getMyAssignedGradeSubjects,
);

teachersRouter.get(
  '/me/subjects/:subjectId/chapters',
  authenticate,
  authorize('teacher', 'class_teacher'),
  validate({ params: subjectIdParamSchema }),
  teachersController.getMyAssignedSubjectChapters,
);

teachersRouter.get(
  '/me/students',
  authenticate,
  authorize('teacher', 'class_teacher'),
  validate({ query: listStudentsQuerySchema }),
  teachersController.getMyAllAssignedStudents,
);

teachersRouter.get(
  '/me/grades/:gradeId/students',
  authenticate,
  authorize('teacher', 'class_teacher'),
  validate({ params: gradeIdParamSchema, query: listStudentsQuerySchema }),
  teachersController.getMyAssignedGradeStudents,
);

// Get assigned grades for specific teacher
teachersRouter.get(
  '/:teacherId/grades',
  authenticate,
  authorize('super_admin', 'admin', 'principal', 'class_teacher', 'teacher'),
  validate({ params: teacherIdParamSchema }),
  teachersController.getTeacherAssignedGrades,
);

// Get teacher by ID (super_admin, same-school staff, or teacher themselves)
teachersRouter.get(
  '/:teacherId',
  authenticate,
  authorize('super_admin', 'admin', 'principal', 'class_teacher', 'teacher'),
  validate({ params: teacherIdParamSchema }),
  teachersController.getTeacherById,
);

// Update teacher (super_admin, own-school admin, or principal)
teachersRouter.patch(
  '/:teacherId',
  authenticate,
  authorize('super_admin', 'admin', 'principal'),
  validate({ params: teacherIdParamSchema, body: updateTeacherSchema }),
  teachersController.updateTeacher,
);

// Soft-delete teacher (super_admin, own-school admin, or principal)
teachersRouter.delete(
  '/:teacherId',
  authenticate,
  authorize('super_admin', 'admin', 'principal'),
  validate({ params: teacherIdParamSchema }),
  teachersController.deleteTeacher,
);
