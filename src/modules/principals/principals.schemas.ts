import { z } from 'zod';

export const PRINCIPAL_STATUSES = ['active', 'inactive'] as const;

export const upsertPrincipalSchema = z.object({
  userId: z.uuid('Invalid user ID format'),
  employeeId: z.string().min(1, 'Employee ID is required').max(50),
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  email: z.email().max(255),
  phone: z.string().max(20).nullable().optional(),
  status: z.enum(PRINCIPAL_STATUSES).default('active').optional(),
});

export const schoolIdParamSchema = z.object({
  schoolId: z.uuid('Invalid school ID format'),
});

export type UpsertPrincipalInput = z.infer<typeof upsertPrincipalSchema>;
export type SchoolIdParam = z.infer<typeof schoolIdParamSchema>;
