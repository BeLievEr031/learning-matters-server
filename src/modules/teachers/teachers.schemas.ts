import { z } from 'zod';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../../config/constants.js';

export const TEACHER_STATUSES = ['active', 'inactive', 'on_leave', 'terminated'] as const;

export const createTeacherSchema = z.object({
  employeeId: z.string().min(1, 'Employee ID is required').max(50),
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  email: z.email().max(255),
  phone: z.string().max(20).optional(),
  userId: z.uuid('Invalid user ID format').optional(),
  joiningDate: z.coerce.date().optional(),
  qualification: z.string().max(255).optional(),
  status: z.enum(TEACHER_STATUSES).default('active'),
});

export const updateTeacherSchema = z.object({
  employeeId: z.string().min(1, 'Employee ID cannot be empty').max(50).optional(),
  firstName: z.string().min(1, 'First name cannot be empty').max(100).optional(),
  lastName: z.string().min(1, 'Last name cannot be empty').max(100).optional(),
  email: z.email().max(255).optional(),
  phone: z.string().max(20).nullable().optional(),
  userId: z.uuid('Invalid user ID format').nullable().optional(),
  joiningDate: z.coerce.date().nullable().optional(),
  qualification: z.string().max(255).nullable().optional(),
  status: z.enum(TEACHER_STATUSES).optional(),
});

export const TEACHER_SORT_FIELDS = [
  'firstName',
  'lastName',
  'employeeId',
  'email',
  'joiningDate',
  'createdAt',
  'status',
] as const;

export const listTeachersQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  cursor: z.string().optional(),
  status: z.enum(TEACHER_STATUSES).optional(),
  search: z.string().optional(),
  sortBy: z.enum(TEACHER_SORT_FIELDS).default('createdAt').optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc').optional(),
});

export const teacherIdParamSchema = z.object({
  teacherId: z.uuid('Invalid teacher ID format'),
});

export const schoolIdParamSchema = z.object({
  schoolId: z.uuid('Invalid school ID format'),
});

export type CreateTeacherInput = z.infer<typeof createTeacherSchema>;
export type UpdateTeacherInput = z.infer<typeof updateTeacherSchema>;
export type ListTeachersQuery = z.infer<typeof listTeachersQuerySchema>;
export type TeacherIdParam = z.infer<typeof teacherIdParamSchema>;
export type SchoolIdParam = z.infer<typeof schoolIdParamSchema>;
