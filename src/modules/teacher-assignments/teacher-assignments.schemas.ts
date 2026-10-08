import { z } from 'zod';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../../config/constants.js';

export const TEACHER_ASSIGNMENT_STATUSES = ['active', 'inactive'] as const;

export const createTeacherAssignmentSchema = z.object({
  teacherId: z.uuid('Invalid teacher ID format'),
  gradeId: z.uuid('Invalid grade ID format'),
  subjectId: z.uuid('Invalid subject ID format'),
  effectiveDate: z.coerce.date().optional(),
  status: z.enum(TEACHER_ASSIGNMENT_STATUSES).default('active').optional(),
});

export const updateTeacherAssignmentSchema = z
  .object({
    status: z.enum(TEACHER_ASSIGNMENT_STATUSES).optional(),
    effectiveDate: z.coerce.date().nullable().optional(),
  })
  .refine(
    (data) => data.status !== undefined || data.effectiveDate !== undefined,
    'At least one field (status or effectiveDate) must be provided for update',
  );

export const listTeacherAssignmentsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  cursor: z.string().optional(),
  teacherId: z.uuid('Invalid teacher ID filter').optional(),
  gradeId: z.uuid('Invalid grade ID filter').optional(),
  subjectId: z.uuid('Invalid subject ID filter').optional(),
  status: z.enum(TEACHER_ASSIGNMENT_STATUSES).optional(),
  schoolId: z.uuid('Invalid school ID filter').optional(),
});

export const assignmentIdParamSchema = z.object({
  assignmentId: z.uuid('Invalid assignment ID format'),
});

export const teacherIdParamSchema = z.object({
  teacherId: z.uuid('Invalid teacher ID format'),
});

export const gradeIdParamSchema = z.object({
  gradeId: z.uuid('Invalid grade ID format'),
});

export const subjectIdParamSchema = z.object({
  subjectId: z.uuid('Invalid subject ID format'),
});

export type CreateTeacherAssignmentInput = z.infer<typeof createTeacherAssignmentSchema>;
export type UpdateTeacherAssignmentInput = z.infer<typeof updateTeacherAssignmentSchema>;
export type ListTeacherAssignmentsQuery = z.infer<typeof listTeacherAssignmentsQuerySchema>;
export type AssignmentIdParam = z.infer<typeof assignmentIdParamSchema>;
export type TeacherIdParam = z.infer<typeof teacherIdParamSchema>;
export type GradeIdParam = z.infer<typeof gradeIdParamSchema>;
export type SubjectIdParam = z.infer<typeof subjectIdParamSchema>;
