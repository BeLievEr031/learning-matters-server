import { z } from 'zod';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../../config/constants.js';

export const STUDENT_STATUSES = [
  'active',
  'inactive',
  'transferred',
  'graduated',
  'suspended',
] as const;

export const STUDENT_GENDERS = ['male', 'female', 'other'] as const;

export const createStudentSchema = z.object({
  admissionNumber: z.string().min(1, 'Admission number is required').max(50),
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  dateOfBirth: z.coerce.date().optional(),
  gender: z.enum(STUDENT_GENDERS).optional(),
  email: z.email().max(255).optional(),
  phone: z.string().max(20).optional(),
  guardianName: z.string().max(200).optional(),
  guardianPhone: z.string().max(20).optional(),
  guardianEmail: z.email().max(255).optional(),
  address: z.string().max(500).optional(),
  userId: z.uuid('Invalid user ID format').optional(),
  status: z.enum(STUDENT_STATUSES).default('active'),
});

export const updateStudentSchema = z.object({
  admissionNumber: z.string().min(1, 'Admission number cannot be empty').max(50).optional(),
  firstName: z.string().min(1, 'First name cannot be empty').max(100).optional(),
  lastName: z.string().min(1, 'Last name cannot be empty').max(100).optional(),
  dateOfBirth: z.coerce.date().nullable().optional(),
  gender: z.enum(STUDENT_GENDERS).nullable().optional(),
  email: z.email().max(255).nullable().optional(),
  phone: z.string().max(20).nullable().optional(),
  guardianName: z.string().max(200).nullable().optional(),
  guardianPhone: z.string().max(20).nullable().optional(),
  guardianEmail: z.email().max(255).nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  userId: z.uuid('Invalid user ID format').nullable().optional(),
  status: z.enum(STUDENT_STATUSES).optional(),
});

export const transferStudentSchema = z.object({
  targetGradeId: z.uuid('Invalid target grade ID format'),
});

export const listStudentsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  cursor: z.string().optional(),
  status: z.enum(STUDENT_STATUSES).optional(),
  gender: z.enum(STUDENT_GENDERS).optional(),
  search: z.string().optional(),
});

export const studentIdParamSchema = z.object({
  studentId: z.uuid('Invalid student ID format'),
});

export const gradeIdParamSchema = z.object({
  gradeId: z.uuid('Invalid grade ID format'),
});

export type CreateStudentInput = z.infer<typeof createStudentSchema>;
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;
export type TransferStudentInput = z.infer<typeof transferStudentSchema>;
export type ListStudentsQuery = z.infer<typeof listStudentsQuerySchema>;
export type StudentIdParam = z.infer<typeof studentIdParamSchema>;
export type GradeIdParam = z.infer<typeof gradeIdParamSchema>;
