import { z } from 'zod';
import {
  extendZodWithOpenApi,
  OpenAPIRegistry,
  OpenApiGeneratorV3,
} from '@asteasolutions/zod-to-openapi';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../config/constants.js';

extendZodWithOpenApi(z);

export const registry = new OpenAPIRegistry();

// ---------------------------------------------------------------------------
// Security Schemes
// ---------------------------------------------------------------------------
export const bearerAuth = registry.registerComponent('securitySchemes', 'bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
  description: 'Enter your short-lived access JWT (e.g. Bearer <token>)',
});

// ---------------------------------------------------------------------------
// Shared Reusable Schemas
// ---------------------------------------------------------------------------
export const ErrorDetailSchema = z
  .object({
    field: z.string().optional().openapi({ example: 'email' }),
    message: z.string().openapi({ example: 'Invalid email address' }),
  })
  .openapi('ErrorDetail');

export const ErrorResponseSchema = z
  .object({
    error: z.object({
      code: z.string().openapi({ example: 'VALIDATION_ERROR' }),
      message: z.string().openapi({ example: 'Request validation failed' }),
      details: z.array(ErrorDetailSchema).optional(),
    }),
  })
  .openapi('ErrorResponse');

export const PageInfoSchema = z
  .object({
    nextCursor: z.string().nullable().openapi({ example: 'ZXhhbXBsZQ==' }),
    hasMore: z.boolean().openapi({ example: true }),
  })
  .openapi('PageInfo');

// ---------------------------------------------------------------------------
// User Schemas
// ---------------------------------------------------------------------------
export const UserRoleSchema = z
  .enum(['super_admin', 'admin', 'principal', 'class_teacher', 'teacher', 'student'])
  .openapi('UserRole');

export const UserSafeSchema = z
  .object({
    id: z.uuid().openapi({ example: '11111111-1111-4111-a111-111111111111' }),
    email: z.email().openapi({ example: 'user@learning-matters.com' }),
    role: UserRoleSchema.openapi({ example: 'student' }),
    schoolId: z.uuid().nullable().openapi({ example: '22222222-2222-4222-a222-222222222222' }),
    firstName: z.string().nullable().openapi({ example: 'John' }),
    lastName: z.string().nullable().openapi({ example: 'Doe' }),
    phone: z.string().nullable().openapi({ example: '+1234567890' }),
    status: z.string().openapi({ example: 'active' }),
    isActive: z.boolean().openapi({ example: true }),
    createdAt: z.iso.datetime().openapi({ example: '2026-01-01T12:00:00.000Z' }),
    updatedAt: z.iso.datetime().openapi({ example: '2026-01-01T12:00:00.000Z' }),
    deletedAt: z.iso.datetime().nullable().openapi({ example: null }),
  })
  .openapi('User');

export const CreateUserRequestSchema = z
  .object({
    email: z.email().openapi({ example: 'newuser@learning-matters.com' }),
    password: z.string().min(12).openapi({ example: 'SecurePassword123!' }),
    role: UserRoleSchema.default('student').openapi({ example: 'student' }),
    schoolId: z.uuid().optional().openapi({ example: '22222222-2222-4222-a222-222222222222' }),
    firstName: z.string().optional().openapi({ example: 'John' }),
    lastName: z.string().optional().openapi({ example: 'Doe' }),
    phone: z.string().optional().openapi({ example: '+1234567890' }),
  })
  .openapi('CreateUserRequest');

export const UpdateUserRequestSchema = z
  .object({
    email: z.email().optional().openapi({ example: 'updated@learning-matters.com' }),
    role: UserRoleSchema.optional().openapi({ example: 'teacher' }),
    schoolId: z.uuid().optional().openapi({ example: '22222222-2222-4222-a222-222222222222' }),
    firstName: z.string().optional().openapi({ example: 'John' }),
    lastName: z.string().optional().openapi({ example: 'Doe' }),
    phone: z.string().optional().openapi({ example: '+1234567890' }),
    status: z.string().optional().openapi({ example: 'active' }),
    isActive: z.boolean().optional().openapi({ example: true }),
  })
  .openapi('UpdateUserRequest');

// ---------------------------------------------------------------------------
// School Schemas
// ---------------------------------------------------------------------------
export const SchoolStatusSchema = z
  .enum(['active', 'inactive', 'suspended'])
  .openapi('SchoolStatus');

export const SchoolSchema = z
  .object({
    id: z.uuid().openapi({ example: '11111111-1111-4111-a111-111111111111' }),
    name: z.string().openapi({ example: 'ABC International School' }),
    code: z.string().openapi({ example: 'ABC001' }),
    address: z.string().nullable().openapi({ example: '42 Knowledge Way' }),
    city: z.string().nullable().openapi({ example: 'New Delhi' }),
    state: z.string().nullable().openapi({ example: 'Delhi' }),
    country: z.string().nullable().openapi({ example: 'India' }),
    phone: z.string().nullable().openapi({ example: '+919876543210' }),
    email: z.email().nullable().openapi({ example: 'contact@abcschool.edu' }),
    website: z.url().nullable().openapi({ example: 'https://abcschool.edu' }),
    logoUrl: z.url().nullable().openapi({ example: 'https://abcschool.edu/logo.png' }),
    status: SchoolStatusSchema.openapi({ example: 'active' }),
    createdAt: z.iso.datetime().openapi({ example: '2026-01-01T12:00:00.000Z' }),
    updatedAt: z.iso.datetime().openapi({ example: '2026-01-01T12:00:00.000Z' }),
    deletedAt: z.iso.datetime().nullable().openapi({ example: null }),
  })
  .openapi('School');

export const CreateSchoolRequestSchema = z
  .object({
    name: z.string().min(1).max(255).openapi({ example: 'ABC International School' }),
    code: z.string().min(1).max(50).openapi({ example: 'ABC001' }),
    address: z.string().optional().openapi({ example: '42 Knowledge Way' }),
    city: z.string().optional().openapi({ example: 'New Delhi' }),
    state: z.string().optional().openapi({ example: 'Delhi' }),
    country: z.string().optional().openapi({ example: 'India' }),
    phone: z.string().optional().openapi({ example: '+919876543210' }),
    email: z.email().optional().openapi({ example: 'contact@abcschool.edu' }),
    website: z.url().optional().openapi({ example: 'https://abcschool.edu' }),
    logoUrl: z.url().optional().openapi({ example: 'https://abcschool.edu/logo.png' }),
    status: SchoolStatusSchema.default('active').openapi({ example: 'active' }),
  })
  .openapi('CreateSchoolRequest');

export const UpdateSchoolRequestSchema = z
  .object({
    name: z.string().min(1).max(255).optional().openapi({ example: 'ABC International Academy' }),
    code: z.string().min(1).max(50).optional().openapi({ example: 'ABC002' }),
    address: z.string().nullable().optional().openapi({ example: '42 Knowledge Way' }),
    city: z.string().nullable().optional().openapi({ example: 'New Delhi' }),
    state: z.string().nullable().openapi({ example: 'Delhi' }),
    country: z.string().nullable().optional().openapi({ example: 'India' }),
    phone: z.string().nullable().optional().openapi({ example: '+919876543210' }),
    email: z.email().nullable().optional().openapi({ example: 'contact@abcschool.edu' }),
    website: z.url().nullable().optional().openapi({ example: 'https://abcschool.edu' }),
    logoUrl: z.url().nullable().optional().openapi({ example: 'https://abcschool.edu/logo.png' }),
    status: SchoolStatusSchema.optional().openapi({ example: 'active' }),
  })
  .openapi('UpdateSchoolRequest');

// ---------------------------------------------------------------------------
// Board Schemas
// ---------------------------------------------------------------------------
export const BoardStatusSchema = z.enum(['active', 'inactive', 'archived']).openapi('BoardStatus');

export const BoardSchema = z
  .object({
    id: z.uuid().openapi({ example: '33333333-3333-4333-a333-333333333333' }),
    schoolId: z.uuid().openapi({ example: '11111111-1111-4111-a111-111111111111' }),
    name: z.string().openapi({ example: 'Central Board of Secondary Education' }),
    code: z.string().openapi({ example: 'CBSE' }),
    description: z.string().nullable().openapi({ example: 'National education curriculum board' }),
    status: BoardStatusSchema.openapi({ example: 'active' }),
    createdAt: z.iso.datetime().openapi({ example: '2026-01-01T12:00:00.000Z' }),
    updatedAt: z.iso.datetime().openapi({ example: '2026-01-01T12:00:00.000Z' }),
    deletedAt: z.iso.datetime().nullable().openapi({ example: null }),
  })
  .openapi('Board');

export const CreateBoardRequestSchema = z
  .object({
    name: z.string().min(1).max(255).openapi({ example: 'Central Board of Secondary Education' }),
    code: z.string().min(1).max(50).openapi({ example: 'CBSE' }),
    description: z
      .string()
      .max(1000)
      .optional()
      .openapi({ example: 'National education curriculum board' }),
    status: BoardStatusSchema.default('active').openapi({ example: 'active' }),
  })
  .openapi('CreateBoardRequest');

export const UpdateBoardRequestSchema = z
  .object({
    name: z
      .string()
      .min(1)
      .max(255)
      .optional()
      .openapi({ example: 'Indian Certificate of Secondary Education' }),
    code: z.string().min(1).max(50).optional().openapi({ example: 'ICSE' }),
    description: z
      .string()
      .max(1000)
      .nullable()
      .optional()
      .openapi({ example: 'National secondary curriculum' }),
    status: BoardStatusSchema.optional().openapi({ example: 'active' }),
  })
  .openapi('UpdateBoardRequest');

// ---------------------------------------------------------------------------
// Grade Schemas
// ---------------------------------------------------------------------------
export const GradeStatusSchema = z.enum(['active', 'inactive', 'archived']).openapi('GradeStatus');

export const GradeSchema = z
  .object({
    id: z.uuid().openapi({ example: '44444444-4444-4444-a444-444444444444' }),
    schoolId: z.uuid().openapi({ example: '11111111-1111-4111-a111-111111111111' }),
    boardId: z.uuid().openapi({ example: '33333333-3333-4333-a333-333333333333' }),
    name: z.string().openapi({ example: 'Grade 10 - Section A' }),
    code: z.string().openapi({ example: 'G10-A' }),
    gradeNumber: z.number().int().openapi({ example: 10 }),
    section: z.string().nullable().openapi({ example: 'A' }),
    capacity: z.number().int().nullable().openapi({ example: 40 }),
    status: GradeStatusSchema.openapi({ example: 'active' }),
    createdAt: z.iso.datetime().openapi({ example: '2026-01-01T12:00:00.000Z' }),
    updatedAt: z.iso.datetime().openapi({ example: '2026-01-01T12:00:00.000Z' }),
    deletedAt: z.iso.datetime().nullable().openapi({ example: null }),
  })
  .openapi('Grade');

export const CreateGradeRequestSchema = z
  .object({
    name: z.string().min(1).max(255).openapi({ example: 'Grade 10 - Section A' }),
    code: z.string().min(1).max(50).openapi({ example: 'G10-A' }),
    gradeNumber: z.number().int().min(0).openapi({ example: 10 }),
    section: z.string().max(50).optional().openapi({ example: 'A' }),
    capacity: z.number().int().min(1).optional().openapi({ example: 40 }),
    status: GradeStatusSchema.default('active').openapi({ example: 'active' }),
  })
  .openapi('CreateGradeRequest');

export const UpdateGradeRequestSchema = z
  .object({
    name: z
      .string()
      .min(1)
      .max(255)
      .optional()
      .openapi({ example: 'Grade 10 - Section A (Senior)' }),
    code: z.string().min(1).max(50).optional().openapi({ example: 'G10-A-SR' }),
    gradeNumber: z.number().int().min(0).optional().openapi({ example: 10 }),
    section: z.string().max(50).nullable().optional().openapi({ example: 'A' }),
    capacity: z.number().int().min(1).nullable().optional().openapi({ example: 45 }),
    status: GradeStatusSchema.optional().openapi({ example: 'active' }),
  })
  .openapi('UpdateGradeRequest');

// ---------------------------------------------------------------------------
// Subject Schemas
// ---------------------------------------------------------------------------
export const SubjectStatusSchema = z
  .enum(['active', 'inactive', 'archived'])
  .openapi('SubjectStatus');

export const GradeSubjectStatusSchema = z
  .enum(['active', 'inactive', 'archived'])
  .openapi('GradeSubjectStatus');

export const SubjectSchema = z
  .object({
    id: z.uuid().openapi({ example: '55555555-5555-4555-a555-555555555555' }),
    schoolId: z.uuid().openapi({ example: '11111111-1111-4111-a111-111111111111' }),
    name: z.string().openapi({ example: 'Mathematics' }),
    code: z.string().openapi({ example: 'MATH' }),
    description: z.string().nullable().openapi({ example: 'Core Mathematics syllabus' }),
    status: SubjectStatusSchema.openapi({ example: 'active' }),
    createdAt: z.iso.datetime().openapi({ example: '2026-01-01T12:00:00.000Z' }),
    updatedAt: z.iso.datetime().openapi({ example: '2026-01-01T12:00:00.000Z' }),
    deletedAt: z.iso.datetime().nullable().openapi({ example: null }),
  })
  .openapi('Subject');

export const GradeSubjectItemSchema = z
  .object({
    id: z.uuid().openapi({ example: '55555555-5555-4555-a555-555555555555' }),
    schoolId: z.uuid().openapi({ example: '11111111-1111-4111-a111-111111111111' }),
    name: z.string().openapi({ example: 'Mathematics' }),
    code: z.string().openapi({ example: 'MATH' }),
    description: z.string().nullable().openapi({ example: 'Core Mathematics syllabus' }),
    status: SubjectStatusSchema.openapi({ example: 'active' }),
    createdAt: z.iso.datetime().openapi({ example: '2026-01-01T12:00:00.000Z' }),
    updatedAt: z.iso.datetime().openapi({ example: '2026-01-01T12:00:00.000Z' }),
    deletedAt: z.iso.datetime().nullable().openapi({ example: null }),
    gradeSubjectId: z.uuid().openapi({ example: '66666666-6666-4666-a666-666666666666' }),
    gradeSubjectStatus: GradeSubjectStatusSchema.openapi({ example: 'active' }),
  })
  .openapi('GradeSubjectItem');

export const AssignOrCreateSubjectRequestSchema = z
  .object({
    subjectId: z.uuid().optional().openapi({ example: '55555555-5555-4555-a555-555555555555' }),
    name: z.string().min(1).max(255).optional().openapi({ example: 'Mathematics' }),
    code: z.string().min(1).max(50).optional().openapi({ example: 'MATH' }),
    description: z
      .string()
      .max(1000)
      .nullable()
      .optional()
      .openapi({ example: 'Core Mathematics syllabus' }),
    status: SubjectStatusSchema.default('active').optional().openapi({ example: 'active' }),
  })
  .openapi('AssignOrCreateSubjectRequest');

export const UpdateSubjectRequestSchema = z
  .object({
    name: z.string().min(1).max(255).optional().openapi({ example: 'Advanced Mathematics' }),
    code: z.string().min(1).max(50).optional().openapi({ example: 'MATH-ADV' }),
    description: z
      .string()
      .max(1000)
      .nullable()
      .optional()
      .openapi({ example: 'Advanced curriculum' }),
    status: SubjectStatusSchema.optional().openapi({ example: 'active' }),
  })
  .openapi('UpdateSubjectRequest');

// ---------------------------------------------------------------------------
// Teacher Schemas
// ---------------------------------------------------------------------------
export const TeacherStatusSchema = z
  .enum(['active', 'inactive', 'on_leave', 'terminated'])
  .openapi('TeacherStatus');

export const TeacherSchema = z
  .object({
    id: z.uuid().openapi({ example: '55555555-5555-4555-a555-555555555555' }),
    schoolId: z.uuid().openapi({ example: '11111111-1111-4111-a111-111111111111' }),
    userId: z.uuid().nullable().openapi({ example: '99999999-9999-4999-a999-999999999999' }),
    employeeId: z.string().openapi({ example: 'EMP-001' }),
    firstName: z.string().openapi({ example: 'Edna' }),
    lastName: z.string().openapi({ example: 'Krabappel' }),
    email: z.email().openapi({ example: 'edna@springfield.edu' }),
    phone: z.string().nullable().openapi({ example: '+15559876543' }),
    joiningDate: z.iso.datetime().nullable().openapi({ example: '2025-08-01T00:00:00.000Z' }),
    qualification: z.string().nullable().openapi({ example: 'M.Ed.' }),
    status: TeacherStatusSchema.openapi({ example: 'active' }),
    createdAt: z.iso.datetime().openapi({ example: '2026-01-01T12:00:00.000Z' }),
    updatedAt: z.iso.datetime().openapi({ example: '2026-01-01T12:00:00.000Z' }),
    deletedAt: z.iso.datetime().nullable().openapi({ example: null }),
  })
  .openapi('Teacher');

export const CreateTeacherRequestSchema = z
  .object({
    employeeId: z.string().min(1).max(50).openapi({ example: 'EMP-001' }),
    firstName: z.string().min(1).max(100).openapi({ example: 'Edna' }),
    lastName: z.string().min(1).max(100).openapi({ example: 'Krabappel' }),
    email: z.email().max(255).openapi({ example: 'edna@springfield.edu' }),
    phone: z.string().max(20).optional().openapi({ example: '+15559876543' }),
    userId: z.uuid().optional().openapi({ example: '99999999-9999-4999-a999-999999999999' }),
    joiningDate: z.iso.datetime().optional().openapi({ example: '2025-08-01T00:00:00.000Z' }),
    qualification: z.string().max(255).optional().openapi({ example: 'M.Ed.' }),
    status: TeacherStatusSchema.default('active').optional().openapi({ example: 'active' }),
  })
  .openapi('CreateTeacherRequest');

export const UpdateTeacherRequestSchema = z
  .object({
    employeeId: z.string().min(1).max(50).optional().openapi({ example: 'EMP-001' }),
    firstName: z.string().min(1).max(100).optional().openapi({ example: 'Edna' }),
    lastName: z.string().min(1).max(100).optional().openapi({ example: 'Krabappel' }),
    email: z.email().max(255).optional().openapi({ example: 'edna@springfield.edu' }),
    phone: z.string().max(20).nullable().optional().openapi({ example: '+15559876543' }),
    userId: z
      .uuid()
      .nullable()
      .optional()
      .openapi({ example: '99999999-9999-4999-a999-999999999999' }),
    joiningDate: z.iso
      .datetime()
      .nullable()
      .optional()
      .openapi({ example: '2025-08-01T00:00:00.000Z' }),
    qualification: z.string().max(255).nullable().optional().openapi({ example: 'Ph.D.' }),
    status: TeacherStatusSchema.optional().openapi({ example: 'active' }),
  })
  .openapi('UpdateTeacherRequest');

// ---------------------------------------------------------------------------
// Student Schemas
// ---------------------------------------------------------------------------
export const StudentStatusSchema = z
  .enum(['active', 'inactive', 'transferred', 'graduated', 'suspended'])
  .openapi('StudentStatus');

export const StudentGenderSchema = z.enum(['male', 'female', 'other']).openapi('StudentGender');

export const StudentSchema = z
  .object({
    id: z.uuid().openapi({ example: '77777777-7777-4777-a777-777777777777' }),
    schoolId: z.uuid().openapi({ example: '11111111-1111-4111-a111-111111111111' }),
    boardId: z.uuid().openapi({ example: '33333333-3333-4333-a333-333333333333' }),
    gradeId: z.uuid().openapi({ example: '44444444-4444-4444-a444-444444444444' }),
    userId: z.uuid().nullable().openapi({ example: '66666666-6666-4666-a666-666666666666' }),
    admissionNumber: z.string().openapi({ example: 'ADM-2026-001' }),
    firstName: z.string().openapi({ example: 'Bart' }),
    lastName: z.string().openapi({ example: 'Simpson' }),
    dateOfBirth: z.iso.datetime().nullable().openapi({ example: '2012-04-01T00:00:00.000Z' }),
    gender: StudentGenderSchema.nullable().openapi({ example: 'male' }),
    email: z.email().nullable().openapi({ example: 'bart@simpson.edu' }),
    phone: z.string().nullable().openapi({ example: '+15551234567' }),
    guardianName: z.string().nullable().openapi({ example: 'Homer Simpson' }),
    guardianPhone: z.string().nullable().openapi({ example: '+15551234567' }),
    guardianEmail: z.email().nullable().openapi({ example: 'homer@simpson.edu' }),
    address: z.string().nullable().openapi({ example: '742 Evergreen Terrace' }),
    status: StudentStatusSchema.openapi({ example: 'active' }),
    createdAt: z.iso.datetime().openapi({ example: '2026-01-01T12:00:00.000Z' }),
    updatedAt: z.iso.datetime().openapi({ example: '2026-01-01T12:00:00.000Z' }),
    deletedAt: z.iso.datetime().nullable().openapi({ example: null }),
  })
  .openapi('Student');

export const CreateStudentRequestSchema = z
  .object({
    admissionNumber: z.string().min(1).max(50).openapi({ example: 'ADM-2026-001' }),
    firstName: z.string().min(1).max(100).openapi({ example: 'Bart' }),
    lastName: z.string().min(1).max(100).openapi({ example: 'Simpson' }),
    dateOfBirth: z.iso.datetime().optional().openapi({ example: '2012-04-01T00:00:00.000Z' }),
    gender: StudentGenderSchema.optional().openapi({ example: 'male' }),
    email: z.email().max(255).optional().openapi({ example: 'bart@simpson.edu' }),
    phone: z.string().max(20).optional().openapi({ example: '+15551234567' }),
    guardianName: z.string().max(200).optional().openapi({ example: 'Homer Simpson' }),
    guardianPhone: z.string().max(20).optional().openapi({ example: '+15551234567' }),
    guardianEmail: z.email().max(255).optional().openapi({ example: 'homer@simpson.edu' }),
    address: z.string().max(500).optional().openapi({ example: '742 Evergreen Terrace' }),
    userId: z.uuid().optional().openapi({ example: '66666666-6666-4666-a666-666666666666' }),
    status: StudentStatusSchema.default('active').optional().openapi({ example: 'active' }),
  })
  .openapi('CreateStudentRequest');

export const UpdateStudentRequestSchema = z
  .object({
    admissionNumber: z.string().min(1).max(50).optional().openapi({ example: 'ADM-2026-001' }),
    firstName: z.string().min(1).max(100).openapi({ example: 'Bart' }),
    lastName: z.string().min(1).max(100).optional().openapi({ example: 'Simpson' }),
    dateOfBirth: z.iso
      .datetime()
      .nullable()
      .optional()
      .openapi({ example: '2012-04-01T00:00:00.000Z' }),
    gender: StudentGenderSchema.nullable().optional().openapi({ example: 'male' }),
    email: z.email().max(255).nullable().optional().openapi({ example: 'bart@simpson.edu' }),
    phone: z.string().max(20).nullable().optional().openapi({ example: '+15551234567' }),
    guardianName: z.string().max(200).nullable().optional().openapi({ example: 'Homer Simpson' }),
    guardianPhone: z.string().max(20).nullable().optional().openapi({ example: '+15551234567' }),
    guardianEmail: z
      .email()
      .max(255)
      .nullable()
      .optional()
      .openapi({ example: 'homer@simpson.edu' }),
    address: z
      .string()
      .max(500)
      .nullable()
      .optional()
      .openapi({ example: '742 Evergreen Terrace' }),
    userId: z
      .uuid()
      .nullable()
      .optional()
      .openapi({ example: '66666666-6666-4666-a666-666666666666' }),
    status: StudentStatusSchema.optional().openapi({ example: 'active' }),
  })
  .openapi('UpdateStudentRequest');

export const TransferStudentRequestSchema = z
  .object({
    targetGradeId: z.uuid().openapi({ example: '55555555-5555-4555-a555-555555555555' }),
  })
  .openapi('TransferStudentRequest');

// ---------------------------------------------------------------------------
// Teacher Assignment Schemas
// ---------------------------------------------------------------------------
export const TeacherAssignmentStatusSchema = z
  .enum(['active', 'inactive'])
  .openapi('TeacherAssignmentStatus');

export const TeacherAssignmentSchema = z
  .object({
    id: z.uuid().openapi({ example: '66666666-6666-4666-a666-666666666666' }),
    schoolId: z.uuid().openapi({ example: '11111111-1111-4111-a111-111111111111' }),
    teacherId: z.uuid().openapi({ example: '33333333-3333-4333-a333-333333333333' }),
    gradeId: z.uuid().openapi({ example: '44444444-4444-4444-a444-444444444444' }),
    subjectId: z.uuid().openapi({ example: '55555555-5555-4555-a555-555555555555' }),
    assignedBy: z.uuid().nullable().openapi({ example: '99999999-9999-4999-a999-999999999999' }),
    status: TeacherAssignmentStatusSchema.openapi({ example: 'active' }),
    effectiveDate: z.iso.datetime().nullable().openapi({ example: '2026-02-01T00:00:00.000Z' }),
    createdAt: z.iso.datetime().openapi({ example: '2026-01-01T12:00:00.000Z' }),
    updatedAt: z.iso.datetime().openapi({ example: '2026-01-01T12:00:00.000Z' }),
    deletedAt: z.iso.datetime().nullable().openapi({ example: null }),
    teacherFirstName: z.string().nullable().optional().openapi({ example: 'Edna' }),
    teacherLastName: z.string().nullable().optional().openapi({ example: 'Krabappel' }),
    teacherEmail: z.string().nullable().optional().openapi({ example: 'edna@springfield.edu' }),
    teacherEmployeeId: z.string().nullable().optional().openapi({ example: 'EMP-001' }),
    gradeName: z.string().nullable().optional().openapi({ example: 'Grade 10 - Section A' }),
    gradeCode: z.string().nullable().optional().openapi({ example: 'G10-A' }),
    subjectName: z.string().nullable().optional().openapi({ example: 'Mathematics' }),
    subjectCode: z.string().nullable().optional().openapi({ example: 'MATH' }),
  })
  .openapi('TeacherAssignment');

export const CreateTeacherAssignmentRequestSchema = z
  .object({
    teacherId: z.uuid().openapi({ example: '33333333-3333-4333-a333-333333333333' }),
    gradeId: z.uuid().openapi({ example: '44444444-4444-4444-a444-444444444444' }),
    subjectId: z.uuid().openapi({ example: '55555555-5555-4555-a555-555555555555' }),
    effectiveDate: z.iso.datetime().optional().openapi({ example: '2026-02-01T00:00:00.000Z' }),
    status: TeacherAssignmentStatusSchema.default('active')
      .optional()
      .openapi({ example: 'active' }),
  })
  .openapi('CreateTeacherAssignmentRequest');

export const UpdateTeacherAssignmentRequestSchema = z
  .object({
    status: TeacherAssignmentStatusSchema.optional().openapi({ example: 'inactive' }),
    effectiveDate: z.iso
      .datetime()
      .nullable()
      .optional()
      .openapi({ example: '2026-06-01T00:00:00.000Z' }),
  })
  .openapi('UpdateTeacherAssignmentRequest');

// ---------------------------------------------------------------------------
// Auth Schemas
// ---------------------------------------------------------------------------
export const TokenPairSchema = z
  .object({
    accessToken: z.string().openapi({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' }),
    refreshToken: z.string().openapi({ example: '7d5a8b299e52c80388d7fce5b5b9...' }),
  })
  .openapi('TokenPair');

export const AuthResponseSchema = z
  .object({
    user: UserSafeSchema,
    tokens: TokenPairSchema,
  })
  .openapi('AuthResponse');

export const RegisterRequestSchema = z
  .object({
    email: z.email().openapi({ example: 'student@learning-matters.com' }),
    password: z.string().min(12).openapi({ example: 'SuperSecure123!' }),
    role: UserRoleSchema.default('student').openapi({ example: 'student' }),
    schoolId: z.uuid().optional().openapi({ example: '22222222-2222-4222-a222-222222222222' }),
    firstName: z.string().optional().openapi({ example: 'Jane' }),
    lastName: z.string().optional().openapi({ example: 'Doe' }),
    phone: z.string().optional().openapi({ example: '+1234567890' }),
  })
  .openapi('RegisterRequest');

export const LoginRequestSchema = z
  .object({
    email: z.email().openapi({ example: 'student@learning-matters.com' }),
    password: z.string().min(1).openapi({ example: 'SuperSecure123!' }),
  })
  .openapi('LoginRequest');

export const RefreshRequestSchema = z
  .object({
    refreshToken: z.string().min(1).openapi({ example: '7d5a8b299e52c80388d7fce5b5b9...' }),
  })
  .openapi('RefreshRequest');

export const RefreshResponseSchema = z
  .object({
    tokens: TokenPairSchema,
  })
  .openapi('RefreshResponse');

export const LogoutRequestSchema = z
  .object({
    refreshToken: z.string().min(1).openapi({ example: '7d5a8b299e52c80388d7fce5b5b9...' }),
  })
  .openapi('LogoutRequest');

// ---------------------------------------------------------------------------
// Health Endpoints
// ---------------------------------------------------------------------------
registry.registerPath({
  method: 'get',
  path: '/healthz',
  tags: ['Health'],
  summary: 'Liveness and uptime check',
  responses: {
    200: {
      description: 'Service is alive',
      content: {
        'application/json': {
          schema: z.object({
            status: z.string().openapi({ example: 'ok' }),
            timestamp: z.iso.datetime(),
          }),
        },
      },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/live',
  tags: ['Health'],
  summary: 'Kubernetes liveness probe',
  responses: {
    200: {
      description: 'Application process is responsive',
      content: {
        'application/json': {
          schema: z.object({
            status: z.string().openapi({ example: 'ok' }),
          }),
        },
      },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/ready',
  tags: ['Health'],
  summary: 'Kubernetes readiness probe',
  description: 'Verifies database pool and dependent systems before accepting traffic.',
  responses: {
    200: {
      description: 'Service is ready to handle traffic',
      content: {
        'application/json': {
          schema: z.object({
            status: z.string().openapi({ example: 'ready' }),
            checks: z.object({
              database: z.string().openapi({ example: 'ok' }),
            }),
          }),
        },
      },
    },
    503: {
      description: 'Service or dependent system is not ready',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

// ---------------------------------------------------------------------------
// Auth Endpoints
// ---------------------------------------------------------------------------
registry.registerPath({
  method: 'post',
  path: '/api/v1/auth/register',
  tags: ['Auth'],
  summary: 'Register a new user account',
  description:
    'Creates a new user with argon2 password hashing and returns access + refresh tokens. Rate limited.',
  request: {
    body: {
      content: {
        'application/json': {
          schema: RegisterRequestSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'User registered successfully',
      content: {
        'application/json': {
          schema: AuthResponseSchema,
        },
      },
    },
    400: {
      description: 'Validation error (e.g. password < 12 characters)',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    409: {
      description: 'User with this email already exists',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    429: {
      description: 'Too many authentication attempts',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/auth/login',
  tags: ['Auth'],
  summary: 'Authenticate credentials and issue tokens',
  description:
    'Constant-time verification against argon2 hashes to prevent user enumeration. Rate limited.',
  request: {
    body: {
      content: {
        'application/json': {
          schema: LoginRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Successfully authenticated',
      content: {
        'application/json': {
          schema: AuthResponseSchema,
        },
      },
    },
    400: {
      description: 'Validation error',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    401: {
      description: 'Invalid email or password (generic to avoid enumeration)',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    429: {
      description: 'Too many authentication attempts',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/auth/refresh',
  tags: ['Auth'],
  summary: 'Rotate refresh token',
  description:
    'Validates raw refresh token against SHA-256 hash, revokes it, and issues a new pair. If a revoked token is reused, all tokens in the family are immediately revoked.',
  request: {
    body: {
      content: {
        'application/json': {
          schema: RefreshRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Tokens successfully rotated',
      content: {
        'application/json': {
          schema: RefreshResponseSchema,
        },
      },
    },
    400: {
      description: 'Validation error',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    401: {
      description: 'Invalid, expired, or reused refresh token',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    429: {
      description: 'Too many authentication attempts',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/auth/logout',
  tags: ['Auth'],
  summary: 'Revoke single refresh token',
  description: 'Revokes the specified refresh token session.',
  request: {
    body: {
      content: {
        'application/json': {
          schema: LogoutRequestSchema,
        },
      },
    },
  },
  responses: {
    204: {
      description: 'Successfully logged out session',
    },
    400: {
      description: 'Validation error',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/auth/logout-all',
  tags: ['Auth'],
  summary: 'Revoke all sessions for current user',
  description: 'Revokes all active refresh tokens belonging to the authenticated user.',
  security: [{ [bearerAuth.name]: [] }],
  responses: {
    204: {
      description: 'Successfully revoked all user sessions',
    },
    401: {
      description: 'Authentication required',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/auth/me',
  tags: ['Auth'],
  summary: 'Get current authenticated user profile',
  description: 'Returns the full profile of the authenticated user based on the access token.',
  security: [{ [bearerAuth.name]: [] }],
  responses: {
    200: {
      description: 'Current user profile',
      content: {
        'application/json': {
          schema: z.object({ user: UserSafeSchema }),
        },
      },
    },
    401: {
      description: 'Authentication required',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    404: {
      description: 'User not found',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

// ---------------------------------------------------------------------------
// Users Endpoints
// ---------------------------------------------------------------------------
registry.registerPath({
  method: 'get',
  path: '/api/v1/users/me',
  tags: ['Users'],
  summary: 'Get current user profile',
  security: [{ [bearerAuth.name]: [] }],
  responses: {
    200: {
      description: 'Current user profile without password_hash',
      content: {
        'application/json': {
          schema: z.object({ data: UserSafeSchema }),
        },
      },
    },
    401: {
      description: 'Authentication required',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'patch',
  path: '/api/v1/users/me',
  tags: ['Users'],
  summary: 'Update current user profile',
  security: [{ [bearerAuth.name]: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: UpdateUserRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Updated user profile',
      content: {
        'application/json': {
          schema: z.object({ data: UserSafeSchema }),
        },
      },
    },
    400: {
      description: 'Validation error',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    401: {
      description: 'Authentication required',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    409: {
      description: 'Email already taken',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/users',
  tags: ['Users'],
  summary: 'List users with cursor pagination (Admin only)',
  security: [{ [bearerAuth.name]: [] }],
  request: {
    query: z.object({
      limit: z.coerce
        .number()
        .int()
        .min(1)
        .max(MAX_PAGE_SIZE)
        .default(DEFAULT_PAGE_SIZE)
        .openapi({ example: 20 }),
      cursor: z.string().optional().openapi({ example: 'ZXhhbXBsZQ==' }),
    }),
  },
  responses: {
    200: {
      description: 'Paginated user list',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(UserSafeSchema),
            pageInfo: PageInfoSchema,
          }),
        },
      },
    },
    400: {
      description: 'Validation error (e.g. limit > 100)',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    401: {
      description: 'Authentication required',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    403: {
      description: 'Forbidden: Admin only',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/users',
  tags: ['Users'],
  summary: 'Create a new user',
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateUserRequestSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'User created successfully',
      content: {
        'application/json': {
          schema: z.object({ data: UserSafeSchema }),
        },
      },
    },
    400: {
      description: 'Validation error',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    409: {
      description: 'Email already exists',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/users/{id}',
  tags: ['Users'],
  summary: 'Get user by ID',
  security: [{ [bearerAuth.name]: [] }],
  request: {
    params: z.object({
      id: z.uuid().openapi({ example: '11111111-1111-4111-a111-111111111111' }),
    }),
  },
  responses: {
    200: {
      description: 'User data without password_hash',
      content: {
        'application/json': {
          schema: z.object({ data: UserSafeSchema }),
        },
      },
    },
    400: {
      description: 'Invalid UUID format',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    401: {
      description: 'Authentication required',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    403: {
      description: 'Forbidden (not owner or admin)',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    404: {
      description: 'User not found',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'patch',
  path: '/api/v1/users/{id}',
  tags: ['Users'],
  summary: 'Update user by ID',
  security: [{ [bearerAuth.name]: [] }],
  request: {
    params: z.object({
      id: z.uuid().openapi({ example: '11111111-1111-4111-a111-111111111111' }),
    }),
    body: {
      content: {
        'application/json': {
          schema: UpdateUserRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'User updated successfully',
      content: {
        'application/json': {
          schema: z.object({ data: UserSafeSchema }),
        },
      },
    },
    400: {
      description: 'Validation error',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    401: {
      description: 'Authentication required',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    403: {
      description: 'Forbidden (not owner or non-admin attempting role change)',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    404: {
      description: 'User not found',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    409: {
      description: 'Email already taken',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'delete',
  path: '/api/v1/users/{id}',
  tags: ['Users'],
  summary: 'Soft-delete user by ID (Admin only)',
  security: [{ [bearerAuth.name]: [] }],
  request: {
    params: z.object({
      id: z.uuid().openapi({ example: '11111111-1111-4111-a111-111111111111' }),
    }),
  },
  responses: {
    204: {
      description: 'User soft-deleted successfully',
    },
    400: {
      description: 'Invalid UUID format',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    401: {
      description: 'Authentication required',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    403: {
      description: 'Forbidden: Admin only',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    404: {
      description: 'User not found',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

// ---------------------------------------------------------------------------
// Schools Endpoints
// ---------------------------------------------------------------------------
registry.registerPath({
  method: 'post',
  path: '/api/v1/schools',
  tags: ['Schools'],
  summary: 'Create a new school (Super Admin only)',
  security: [{ [bearerAuth.name]: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateSchoolRequestSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'School created successfully',
      content: {
        'application/json': {
          schema: z.object({ data: SchoolSchema }),
        },
      },
    },
    400: {
      description: 'Validation error',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    401: {
      description: 'Authentication required',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    403: {
      description: 'Forbidden: Super Admin only',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    409: {
      description: 'School with this code already exists',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/schools',
  tags: ['Schools'],
  summary: 'List schools with pagination and filtering (Super Admin only)',
  security: [{ [bearerAuth.name]: [] }],
  request: {
    query: z.object({
      limit: z.coerce
        .number()
        .int()
        .min(1)
        .max(MAX_PAGE_SIZE)
        .default(DEFAULT_PAGE_SIZE)
        .openapi({ example: 20 }),
      cursor: z.string().optional().openapi({ example: 'ZXhhbXBsZQ==' }),
      status: SchoolStatusSchema.optional().openapi({ example: 'active' }),
      search: z.string().optional().openapi({ example: 'Greenwood' }),
    }),
  },
  responses: {
    200: {
      description: 'Paginated schools list',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(SchoolSchema),
            pageInfo: PageInfoSchema,
          }),
        },
      },
    },
    400: {
      description: 'Validation error',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    401: {
      description: 'Authentication required',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    403: {
      description: 'Forbidden: Super Admin only',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/schools/{schoolId}',
  tags: ['Schools'],
  summary: 'Get school by ID (Super Admin or own-school Admin/Principal)',
  security: [{ [bearerAuth.name]: [] }],
  request: {
    params: z.object({
      schoolId: z.uuid().openapi({ example: '11111111-1111-4111-a111-111111111111' }),
    }),
  },
  responses: {
    200: {
      description: 'School details',
      content: {
        'application/json': {
          schema: z.object({ data: SchoolSchema }),
        },
      },
    },
    400: {
      description: 'Invalid UUID format',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    401: {
      description: 'Authentication required',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    403: {
      description: 'Forbidden: Insufficient permissions or wrong school scope',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    404: {
      description: 'School not found',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'patch',
  path: '/api/v1/schools/{schoolId}',
  tags: ['Schools'],
  summary: 'Update school by ID (Super Admin only)',
  security: [{ [bearerAuth.name]: [] }],
  request: {
    params: z.object({
      schoolId: z.uuid().openapi({ example: '11111111-1111-4111-a111-111111111111' }),
    }),
    body: {
      content: {
        'application/json': {
          schema: UpdateSchoolRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'School updated successfully',
      content: {
        'application/json': {
          schema: z.object({ data: SchoolSchema }),
        },
      },
    },
    400: {
      description: 'Validation error',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    401: {
      description: 'Authentication required',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    403: {
      description: 'Forbidden: Super Admin only',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    404: {
      description: 'School not found',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    409: {
      description: 'School with this code already exists',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'delete',
  path: '/api/v1/schools/{schoolId}',
  tags: ['Schools'],
  summary: 'Soft-delete school by ID (Super Admin only)',
  security: [{ [bearerAuth.name]: [] }],
  request: {
    params: z.object({
      schoolId: z.uuid().openapi({ example: '11111111-1111-4111-a111-111111111111' }),
    }),
  },
  responses: {
    204: {
      description: 'School soft-deleted successfully',
    },
    400: {
      description: 'Invalid UUID format',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    401: {
      description: 'Authentication required',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    403: {
      description: 'Forbidden: Super Admin only',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    404: {
      description: 'School not found',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

// ---------------------------------------------------------------------------
// Board Endpoints
// ---------------------------------------------------------------------------
registry.registerPath({
  method: 'post',
  path: '/api/v1/schools/{schoolId}/boards',
  tags: ['Boards'],
  summary: 'Create board in school (Super Admin or School Admin)',
  security: [{ [bearerAuth.name]: [] }],
  request: {
    params: z.object({
      schoolId: z.uuid().openapi({ example: '11111111-1111-4111-a111-111111111111' }),
    }),
    body: {
      required: true,
      content: {
        'application/json': {
          schema: CreateBoardRequestSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Board created successfully',
      content: {
        'application/json': {
          schema: z.object({ data: BoardSchema }),
        },
      },
    },
    400: {
      description: 'Validation error',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    401: {
      description: 'Authentication required',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    403: {
      description: 'Forbidden: Super Admin or own-school Admin only',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    404: {
      description: 'School not found',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    409: {
      description: 'Board with this code already exists for this school',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/schools/{schoolId}/boards',
  tags: ['Boards'],
  summary: 'List boards in school (Super Admin, School Admin, or Principal)',
  security: [{ [bearerAuth.name]: [] }],
  request: {
    params: z.object({
      schoolId: z.uuid().openapi({ example: '11111111-1111-4111-a111-111111111111' }),
    }),
    query: z.object({
      limit: z.coerce
        .number()
        .int()
        .min(1)
        .max(MAX_PAGE_SIZE)
        .default(DEFAULT_PAGE_SIZE)
        .optional(),
      cursor: z.string().optional().openapi({ example: 'ZXhhbXBsZQ==' }),
      status: BoardStatusSchema.optional(),
      search: z.string().optional().openapi({ example: 'CBSE' }),
    }),
  },
  responses: {
    200: {
      description: 'Paginated list of boards for the school',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(BoardSchema),
            pageInfo: PageInfoSchema,
          }),
        },
      },
    },
    400: {
      description: 'Invalid query parameters or school ID',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    401: {
      description: 'Authentication required',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    403: {
      description: 'Forbidden: Super Admin or own-school access only',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    404: {
      description: 'School not found',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/boards/{boardId}',
  tags: ['Boards'],
  summary: 'Get board by ID (Super Admin, School Admin, or Principal)',
  security: [{ [bearerAuth.name]: [] }],
  request: {
    params: z.object({
      boardId: z.uuid().openapi({ example: '33333333-3333-4333-a333-333333333333' }),
    }),
  },
  responses: {
    200: {
      description: 'Board details retrieved successfully',
      content: {
        'application/json': {
          schema: z.object({ data: BoardSchema }),
        },
      },
    },
    400: {
      description: 'Invalid board ID format',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    401: {
      description: 'Authentication required',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    403: {
      description: 'Forbidden: Access to this board is not allowed',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    404: {
      description: 'Board not found',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'patch',
  path: '/api/v1/boards/{boardId}',
  tags: ['Boards'],
  summary: 'Update board by ID (Super Admin or School Admin)',
  security: [{ [bearerAuth.name]: [] }],
  request: {
    params: z.object({
      boardId: z.uuid().openapi({ example: '33333333-3333-4333-a333-333333333333' }),
    }),
    body: {
      required: true,
      content: {
        'application/json': {
          schema: UpdateBoardRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Board updated successfully',
      content: {
        'application/json': {
          schema: z.object({ data: BoardSchema }),
        },
      },
    },
    400: {
      description: 'Validation error or invalid board ID format',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    401: {
      description: 'Authentication required',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    403: {
      description: 'Forbidden: Super Admin or own-school Admin only',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    404: {
      description: 'Board not found',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    409: {
      description: 'Board with this code already exists for this school',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'delete',
  path: '/api/v1/boards/{boardId}',
  tags: ['Boards'],
  summary: 'Soft-delete board by ID (Super Admin or School Admin)',
  security: [{ [bearerAuth.name]: [] }],
  request: {
    params: z.object({
      boardId: z.uuid().openapi({ example: '33333333-3333-4333-a333-333333333333' }),
    }),
  },
  responses: {
    204: {
      description: 'Board soft-deleted successfully',
    },
    400: {
      description: 'Invalid board ID format',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    401: {
      description: 'Authentication required',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    403: {
      description: 'Forbidden: Super Admin or own-school Admin only',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    404: {
      description: 'Board not found',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

// ---------------------------------------------------------------------------
// Grade Endpoints
// ---------------------------------------------------------------------------
registry.registerPath({
  method: 'post',
  path: '/api/v1/boards/{boardId}/grades',
  tags: ['Grades'],
  summary: 'Create grade under a board (Super Admin or School Admin)',
  security: [{ [bearerAuth.name]: [] }],
  request: {
    params: z.object({
      boardId: z.uuid().openapi({ example: '33333333-3333-4333-a333-333333333333' }),
    }),
    body: {
      required: true,
      content: {
        'application/json': {
          schema: CreateGradeRequestSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Grade created successfully',
      content: {
        'application/json': {
          schema: z.object({ data: GradeSchema }),
        },
      },
    },
    400: {
      description: 'Validation error',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    401: {
      description: 'Authentication required',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    403: {
      description: 'Forbidden: Super Admin or own-school Admin only',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    404: {
      description: 'Board not found',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    409: {
      description: 'Grade with this number and section already exists for this board',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/boards/{boardId}/grades',
  tags: ['Grades'],
  summary: 'List grades under a board (Super Admin, School Admin, Principal, or Class Teacher)',
  security: [{ [bearerAuth.name]: [] }],
  request: {
    params: z.object({
      boardId: z.uuid().openapi({ example: '33333333-3333-4333-a333-333333333333' }),
    }),
    query: z.object({
      limit: z.coerce
        .number()
        .int()
        .min(1)
        .max(MAX_PAGE_SIZE)
        .default(DEFAULT_PAGE_SIZE)
        .optional(),
      cursor: z.string().optional().openapi({ example: 'ZXhhbXBsZQ==' }),
      status: GradeStatusSchema.optional(),
      section: z.string().optional().openapi({ example: 'A' }),
      gradeNumber: z.coerce.number().int().optional().openapi({ example: 10 }),
      search: z.string().optional().openapi({ example: 'Grade 10' }),
    }),
  },
  responses: {
    200: {
      description: 'Paginated list of grades for the board',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(GradeSchema),
            pageInfo: PageInfoSchema,
          }),
        },
      },
    },
    400: {
      description: 'Invalid query parameters or board ID',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    401: {
      description: 'Authentication required',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    403: {
      description: 'Forbidden: Super Admin or own-school access only',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    404: {
      description: 'Board not found',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/grades/{gradeId}',
  tags: ['Grades'],
  summary: 'Get grade by ID (Super Admin, School Admin, Principal, or Class Teacher)',
  security: [{ [bearerAuth.name]: [] }],
  request: {
    params: z.object({
      gradeId: z.uuid().openapi({ example: '44444444-4444-4444-a444-444444444444' }),
    }),
  },
  responses: {
    200: {
      description: 'Grade details retrieved successfully',
      content: {
        'application/json': {
          schema: z.object({ data: GradeSchema }),
        },
      },
    },
    400: {
      description: 'Invalid grade ID format',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    401: {
      description: 'Authentication required',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    403: {
      description: 'Forbidden: Access to this grade is not allowed',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    404: {
      description: 'Grade not found',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'patch',
  path: '/api/v1/grades/{gradeId}',
  tags: ['Grades'],
  summary: 'Update grade by ID (Super Admin or School Admin)',
  security: [{ [bearerAuth.name]: [] }],
  request: {
    params: z.object({
      gradeId: z.uuid().openapi({ example: '44444444-4444-4444-a444-444444444444' }),
    }),
    body: {
      required: true,
      content: {
        'application/json': {
          schema: UpdateGradeRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Grade updated successfully',
      content: {
        'application/json': {
          schema: z.object({ data: GradeSchema }),
        },
      },
    },
    400: {
      description: 'Validation error or invalid grade ID format',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    401: {
      description: 'Authentication required',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    403: {
      description: 'Forbidden: Super Admin or own-school Admin only',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    404: {
      description: 'Grade not found',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    409: {
      description: 'Grade with this number and section already exists for this board',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'delete',
  path: '/api/v1/grades/{gradeId}',
  tags: ['Grades'],
  summary: 'Soft-delete grade by ID (Super Admin or School Admin)',
  security: [{ [bearerAuth.name]: [] }],
  request: {
    params: z.object({
      gradeId: z.uuid().openapi({ example: '44444444-4444-4444-a444-444444444444' }),
    }),
  },
  responses: {
    204: {
      description: 'Grade soft-deleted successfully',
    },
    400: {
      description: 'Invalid grade ID format',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    401: {
      description: 'Authentication required',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    403: {
      description: 'Forbidden: Super Admin or own-school Admin only',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    404: {
      description: 'Grade not found',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    409: {
      description: 'Cannot delete grade with active enrolled students',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

// ---------------------------------------------------------------------------
// Subject Endpoints
// ---------------------------------------------------------------------------
registry.registerPath({
  method: 'post',
  path: '/api/v1/grades/{gradeId}/subjects',
  tags: ['Subjects'],
  summary: 'Assign existing or create new subject for a grade (Super Admin or School Admin)',
  security: [{ [bearerAuth.name]: [] }],
  request: {
    params: z.object({
      gradeId: z.uuid().openapi({ example: '33333333-3333-4333-a333-333333333333' }),
    }),
    body: {
      required: true,
      content: {
        'application/json': {
          schema: AssignOrCreateSubjectRequestSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Subject assigned or created successfully for the grade',
      content: {
        'application/json': {
          schema: z.object({ data: GradeSubjectItemSchema }),
        },
      },
    },
    400: {
      description: 'Validation error',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    401: {
      description: 'Authentication required',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    403: {
      description: 'Forbidden: Super Admin or own-school Admin only',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    404: {
      description: 'Grade or subject not found',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    409: {
      description: 'Subject is already assigned to this grade',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/grades/{gradeId}/subjects',
  tags: ['Subjects'],
  summary:
    'List subjects associated with a grade (Super Admin, School Admin, Principal, Class Teacher, or Teacher)',
  security: [{ [bearerAuth.name]: [] }],
  request: {
    params: z.object({
      gradeId: z.uuid().openapi({ example: '33333333-3333-4333-a333-333333333333' }),
    }),
    query: z.object({
      limit: z.coerce
        .number()
        .int()
        .min(1)
        .max(MAX_PAGE_SIZE)
        .default(DEFAULT_PAGE_SIZE)
        .optional(),
      cursor: z.string().optional().openapi({ example: 'ZXhhbXBsZQ==' }),
      status: SubjectStatusSchema.optional(),
      search: z.string().optional().openapi({ example: 'Math' }),
    }),
  },
  responses: {
    200: {
      description: 'Paginated list of subjects associated with the grade',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(GradeSubjectItemSchema),
            pageInfo: PageInfoSchema,
          }),
        },
      },
    },
    400: {
      description: 'Invalid parameter or query format',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    401: {
      description: 'Authentication required',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    403: {
      description: 'Forbidden: Insufficient permissions or wrong school',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    404: {
      description: 'Grade not found',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'delete',
  path: '/api/v1/grades/{gradeId}/subjects/{subjectId}',
  tags: ['Subjects'],
  summary: 'Remove subject assignment from a grade (Super Admin or School Admin)',
  security: [{ [bearerAuth.name]: [] }],
  request: {
    params: z.object({
      gradeId: z.uuid().openapi({ example: '33333333-3333-4333-a333-333333333333' }),
      subjectId: z.uuid().openapi({ example: '55555555-5555-4555-a555-555555555555' }),
    }),
  },
  responses: {
    204: {
      description: 'Subject unassigned from grade successfully',
    },
    400: {
      description: 'Invalid UUID format',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    401: {
      description: 'Authentication required',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    403: {
      description: 'Forbidden: Super Admin or own-school Admin only',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    404: {
      description: 'Grade, subject, or assignment not found',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/subjects/{subjectId}',
  tags: ['Subjects'],
  summary:
    'Get master subject by ID (Super Admin, School Admin, Principal, Class Teacher, or Teacher)',
  security: [{ [bearerAuth.name]: [] }],
  request: {
    params: z.object({
      subjectId: z.uuid().openapi({ example: '55555555-5555-4555-a555-555555555555' }),
    }),
  },
  responses: {
    200: {
      description: 'Subject details retrieved successfully',
      content: {
        'application/json': {
          schema: z.object({ data: SubjectSchema }),
        },
      },
    },
    400: {
      description: 'Invalid subject ID format',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    401: {
      description: 'Authentication required',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    403: {
      description: 'Forbidden: Insufficient permissions or wrong school',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    404: {
      description: 'Subject not found',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'patch',
  path: '/api/v1/subjects/{subjectId}',
  tags: ['Subjects'],
  summary: 'Update master subject (Super Admin or School Admin)',
  security: [{ [bearerAuth.name]: [] }],
  request: {
    params: z.object({
      subjectId: z.uuid().openapi({ example: '55555555-5555-4555-a555-555555555555' }),
    }),
    body: {
      required: true,
      content: {
        'application/json': {
          schema: UpdateSubjectRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Subject updated successfully',
      content: {
        'application/json': {
          schema: z.object({ data: SubjectSchema }),
        },
      },
    },
    400: {
      description: 'Validation error',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    401: {
      description: 'Authentication required',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    403: {
      description: 'Forbidden: Super Admin or own-school Admin only',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    404: {
      description: 'Subject not found',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    409: {
      description: 'Subject code already exists in this school',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'delete',
  path: '/api/v1/subjects/{subjectId}',
  tags: ['Subjects'],
  summary:
    'Soft-delete master subject and cascade unassign from grades (Super Admin or School Admin)',
  security: [{ [bearerAuth.name]: [] }],
  request: {
    params: z.object({
      subjectId: z.uuid().openapi({ example: '55555555-5555-4555-a555-555555555555' }),
    }),
  },
  responses: {
    204: {
      description: 'Subject soft-deleted successfully',
    },
    400: {
      description: 'Invalid subject ID format',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    401: {
      description: 'Authentication required',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    403: {
      description: 'Forbidden: Super Admin or own-school Admin only',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    404: {
      description: 'Subject not found',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

// ---------------------------------------------------------------------------
// Teacher Endpoints
// ---------------------------------------------------------------------------
registry.registerPath({
  method: 'post',
  path: '/api/v1/schools/{schoolId}/teachers',
  tags: ['Teachers'],
  summary: 'Create teacher under a school (Super Admin or School Admin)',
  security: [{ [bearerAuth.name]: [] }],
  request: {
    params: z.object({
      schoolId: z.uuid().openapi({ example: '11111111-1111-4111-a111-111111111111' }),
    }),
    body: {
      required: true,
      content: {
        'application/json': {
          schema: CreateTeacherRequestSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Teacher created successfully',
      content: {
        'application/json': {
          schema: z.object({ data: TeacherSchema }),
        },
      },
    },
    400: {
      description: 'Validation error',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    401: {
      description: 'Authentication required',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    403: {
      description: 'Forbidden: Super Admin or own-school Admin only',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    404: {
      description: 'School or linked user not found',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    409: {
      description: 'Teacher with this employee ID or email already exists in this school',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/schools/{schoolId}/teachers',
  tags: ['Teachers'],
  summary: 'List teachers under a school (Super Admin, School Admin, or Principal)',
  security: [{ [bearerAuth.name]: [] }],
  request: {
    params: z.object({
      schoolId: z.uuid().openapi({ example: '11111111-1111-4111-a111-111111111111' }),
    }),
    query: z.object({
      limit: z.coerce
        .number()
        .int()
        .min(1)
        .max(MAX_PAGE_SIZE)
        .default(DEFAULT_PAGE_SIZE)
        .optional(),
      cursor: z.string().optional().openapi({ example: 'ZXhhbXBsZQ==' }),
      status: TeacherStatusSchema.optional(),
      search: z.string().optional().openapi({ example: 'Edna' }),
    }),
  },
  responses: {
    200: {
      description: 'Paginated list of teachers under the school',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(TeacherSchema),
            pageInfo: PageInfoSchema,
          }),
        },
      },
    },
    400: {
      description: 'Invalid parameter or query format',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    401: {
      description: 'Authentication required',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    403: {
      description: 'Forbidden: Insufficient permissions or wrong school',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    404: {
      description: 'School not found',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/teachers/{teacherId}',
  tags: ['Teachers'],
  summary: 'Get teacher profile by ID (Super Admin, same-school staff, or teacher self)',
  security: [{ [bearerAuth.name]: [] }],
  request: {
    params: z.object({
      teacherId: z.uuid().openapi({ example: '55555555-5555-4555-a555-555555555555' }),
    }),
  },
  responses: {
    200: {
      description: 'Teacher details retrieved successfully',
      content: {
        'application/json': {
          schema: z.object({ data: TeacherSchema }),
        },
      },
    },
    400: {
      description: 'Invalid teacher ID format',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    401: {
      description: 'Authentication required',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    403: {
      description: 'Forbidden: Insufficient permissions or wrong school',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    404: {
      description: 'Teacher not found',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'patch',
  path: '/api/v1/teachers/{teacherId}',
  tags: ['Teachers'],
  summary: 'Update teacher profile (Super Admin or School Admin)',
  security: [{ [bearerAuth.name]: [] }],
  request: {
    params: z.object({
      teacherId: z.uuid().openapi({ example: '55555555-5555-4555-a555-555555555555' }),
    }),
    body: {
      required: true,
      content: {
        'application/json': {
          schema: UpdateTeacherRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Teacher profile updated successfully',
      content: {
        'application/json': {
          schema: z.object({ data: TeacherSchema }),
        },
      },
    },
    400: {
      description: 'Validation error',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    401: {
      description: 'Authentication required',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    403: {
      description: 'Forbidden: Super Admin or own-school Admin only',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    404: {
      description: 'Teacher or linked user not found',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    409: {
      description: 'Teacher employee ID or email already exists in this school',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'delete',
  path: '/api/v1/teachers/{teacherId}',
  tags: ['Teachers'],
  summary: 'Soft-delete teacher profile (Super Admin or School Admin)',
  security: [{ [bearerAuth.name]: [] }],
  request: {
    params: z.object({
      teacherId: z.uuid().openapi({ example: '55555555-5555-4555-a555-555555555555' }),
    }),
  },
  responses: {
    204: {
      description: 'Teacher soft-deleted successfully',
    },
    400: {
      description: 'Invalid teacher ID format',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    401: {
      description: 'Authentication required',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    403: {
      description: 'Forbidden: Super Admin or own-school Admin only',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    404: {
      description: 'Teacher not found',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

// ---------------------------------------------------------------------------
// Student Endpoints
// ---------------------------------------------------------------------------
registry.registerPath({
  method: 'post',
  path: '/api/v1/grades/{gradeId}/students',
  tags: ['Students'],
  summary: 'Enroll student under grade (Super Admin or School Admin)',
  security: [{ [bearerAuth.name]: [] }],
  request: {
    params: z.object({
      gradeId: z.uuid().openapi({ example: '44444444-4444-4444-a444-444444444444' }),
    }),
    body: {
      content: {
        'application/json': {
          schema: CreateStudentRequestSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Student enrolled successfully',
      content: {
        'application/json': {
          schema: z.object({ data: StudentSchema }),
        },
      },
    },
    400: {
      description: 'Validation failed or grade is inactive',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    401: {
      description: 'Authentication required',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    403: {
      description: 'Forbidden: Super Admin or own-school Admin only',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    404: {
      description: 'Grade or linked user not found',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    409: {
      description: 'Admission number already exists in this school',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/grades/{gradeId}/students',
  tags: ['Students'],
  summary:
    'List students in grade with pagination (Super Admin, School Admin, Principal, or Class Teacher)',
  security: [{ [bearerAuth.name]: [] }],
  request: {
    params: z.object({
      gradeId: z.uuid().openapi({ example: '44444444-4444-4444-a444-444444444444' }),
    }),
    query: z.object({
      limit: z.coerce
        .number()
        .int()
        .min(1)
        .max(MAX_PAGE_SIZE)
        .default(DEFAULT_PAGE_SIZE)
        .optional(),
      cursor: z.string().optional(),
      status: StudentStatusSchema.optional(),
      gender: StudentGenderSchema.optional(),
      search: z.string().optional(),
    }),
  },
  responses: {
    200: {
      description: 'Paginated list of students in grade',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(StudentSchema),
            pageInfo: PageInfoSchema,
          }),
        },
      },
    },
    400: {
      description: 'Invalid query parameters',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    401: {
      description: 'Authentication required',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    403: {
      description: 'Forbidden: Cannot access students from another school',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    404: {
      description: 'Grade not found',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/students/{studentId}',
  tags: ['Students'],
  summary: 'Get student by ID (Super Admin, School Staff, or Student)',
  security: [{ [bearerAuth.name]: [] }],
  request: {
    params: z.object({
      studentId: z.uuid().openapi({ example: '77777777-7777-4777-a777-777777777777' }),
    }),
  },
  responses: {
    200: {
      description: 'Student profile retrieved',
      content: {
        'application/json': {
          schema: z.object({ data: StudentSchema }),
        },
      },
    },
    400: {
      description: 'Invalid student ID format',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    401: {
      description: 'Authentication required',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    403: {
      description: 'Forbidden: Cannot access student from another school',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    404: {
      description: 'Student not found',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'patch',
  path: '/api/v1/students/{studentId}',
  tags: ['Students'],
  summary: 'Update student profile (Super Admin or School Admin)',
  security: [{ [bearerAuth.name]: [] }],
  request: {
    params: z.object({
      studentId: z.uuid().openapi({ example: '77777777-7777-4777-a777-777777777777' }),
    }),
    body: {
      content: {
        'application/json': {
          schema: UpdateStudentRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Student updated successfully',
      content: {
        'application/json': {
          schema: z.object({ data: StudentSchema }),
        },
      },
    },
    400: {
      description: 'Validation failed',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    401: {
      description: 'Authentication required',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    403: {
      description: 'Forbidden: Super Admin or own-school Admin only',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    404: {
      description: 'Student or linked user not found',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    409: {
      description: 'Admission number already exists in this school',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'patch',
  path: '/api/v1/students/{studentId}/transfer',
  tags: ['Students'],
  summary: 'Transfer student to another grade (Super Admin or School Admin)',
  security: [{ [bearerAuth.name]: [] }],
  request: {
    params: z.object({
      studentId: z.uuid().openapi({ example: '77777777-7777-4777-a777-777777777777' }),
    }),
    body: {
      content: {
        'application/json': {
          schema: TransferStudentRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Student transferred successfully',
      content: {
        'application/json': {
          schema: z.object({ data: StudentSchema }),
        },
      },
    },
    400: {
      description: 'Validation failed, target grade is inactive, or in another school',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    401: {
      description: 'Authentication required',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    403: {
      description: 'Forbidden: Super Admin or own-school Admin only',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    404: {
      description: 'Student or target grade not found',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'delete',
  path: '/api/v1/students/{studentId}',
  tags: ['Students'],
  summary: 'Soft-delete student profile (Super Admin or School Admin)',
  security: [{ [bearerAuth.name]: [] }],
  request: {
    params: z.object({
      studentId: z.uuid().openapi({ example: '77777777-7777-4777-a777-777777777777' }),
    }),
  },
  responses: {
    204: {
      description: 'Student soft-deleted successfully',
    },
    400: {
      description: 'Invalid student ID format',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    401: {
      description: 'Authentication required',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    403: {
      description: 'Forbidden: Super Admin or own-school Admin only',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    404: {
      description: 'Student not found',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

// ---------------------------------------------------------------------------
// Teacher Assignment Endpoints
// ---------------------------------------------------------------------------
registry.registerPath({
  method: 'post',
  path: '/api/v1/teacher-assignments',
  tags: ['Teacher Assignments'],
  summary: 'Assign teacher to grade and subject (Super Admin or School Admin)',
  security: [{ [bearerAuth.name]: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateTeacherAssignmentRequestSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Teacher assigned successfully',
      content: {
        'application/json': {
          schema: z.object({ data: TeacherAssignmentSchema }),
        },
      },
    },
    400: {
      description: 'Validation failed, entity inactive, or subject not assigned to grade',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    401: {
      description: 'Authentication required',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    403: {
      description: 'Forbidden: Super Admin or own-school Admin only',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    404: {
      description: 'Teacher, grade, or subject not found',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    409: {
      description: 'Teacher is already assigned to this grade and subject',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/teacher-assignments',
  tags: ['Teacher Assignments'],
  summary:
    'List teacher assignments with pagination and filters (Super Admin, School Admin, or Principal)',
  security: [{ [bearerAuth.name]: [] }],
  request: {
    query: z.object({
      limit: z.coerce
        .number()
        .int()
        .min(1)
        .max(MAX_PAGE_SIZE)
        .default(DEFAULT_PAGE_SIZE)
        .optional(),
      cursor: z.string().optional(),
      teacherId: z.uuid().optional(),
      gradeId: z.uuid().optional(),
      subjectId: z.uuid().optional(),
      status: TeacherAssignmentStatusSchema.optional(),
      schoolId: z.uuid().optional(),
    }),
  },
  responses: {
    200: {
      description: 'Paginated list of teacher assignments',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(TeacherAssignmentSchema),
            pageInfo: PageInfoSchema,
          }),
        },
      },
    },
    400: {
      description: 'Invalid query parameters',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    401: {
      description: 'Authentication required',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    403: {
      description: 'Forbidden: Cannot access assignments from another school',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/teacher-assignments/{assignmentId}',
  tags: ['Teacher Assignments'],
  summary: 'Get teacher assignment by ID (Super Admin, School Staff)',
  security: [{ [bearerAuth.name]: [] }],
  request: {
    params: z.object({
      assignmentId: z.uuid().openapi({ example: '66666666-6666-4666-a666-666666666666' }),
    }),
  },
  responses: {
    200: {
      description: 'Teacher assignment retrieved',
      content: {
        'application/json': {
          schema: z.object({ data: TeacherAssignmentSchema }),
        },
      },
    },
    400: {
      description: 'Invalid assignment ID format',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    401: {
      description: 'Authentication required',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    403: {
      description: 'Forbidden: Cannot access assignment from another school',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    404: {
      description: 'Teacher assignment not found',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'patch',
  path: '/api/v1/teacher-assignments/{assignmentId}',
  tags: ['Teacher Assignments'],
  summary: 'Update teacher assignment status or effective date (Super Admin or School Admin)',
  security: [{ [bearerAuth.name]: [] }],
  request: {
    params: z.object({
      assignmentId: z.uuid().openapi({ example: '66666666-6666-4666-a666-666666666666' }),
    }),
    body: {
      content: {
        'application/json': {
          schema: UpdateTeacherAssignmentRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Teacher assignment updated successfully',
      content: {
        'application/json': {
          schema: z.object({ data: TeacherAssignmentSchema }),
        },
      },
    },
    400: {
      description: 'Validation failed',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    401: {
      description: 'Authentication required',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    403: {
      description: 'Forbidden: Super Admin or own-school Admin only',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    404: {
      description: 'Teacher assignment not found',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'delete',
  path: '/api/v1/teacher-assignments/{assignmentId}',
  tags: ['Teacher Assignments'],
  summary: 'Soft-delete teacher assignment (Super Admin or School Admin)',
  security: [{ [bearerAuth.name]: [] }],
  request: {
    params: z.object({
      assignmentId: z.uuid().openapi({ example: '66666666-6666-4666-a666-666666666666' }),
    }),
  },
  responses: {
    204: {
      description: 'Teacher assignment soft-deleted successfully',
    },
    400: {
      description: 'Invalid assignment ID format',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    401: {
      description: 'Authentication required',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    403: {
      description: 'Forbidden: Super Admin or own-school Admin only',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    404: {
      description: 'Teacher assignment not found',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/teachers/{teacherId}/assignments',
  tags: ['Teacher Assignments'],
  summary: 'List all assignments for a teacher (Super Admin, School Staff)',
  security: [{ [bearerAuth.name]: [] }],
  request: {
    params: z.object({
      teacherId: z.uuid().openapi({ example: '33333333-3333-4333-a333-333333333333' }),
    }),
  },
  responses: {
    200: {
      description: 'List of assignments for teacher',
      content: {
        'application/json': {
          schema: z.object({ data: z.array(TeacherAssignmentSchema) }),
        },
      },
    },
    400: {
      description: 'Invalid teacher ID format',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    401: {
      description: 'Authentication required',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    403: {
      description: 'Forbidden: Cannot access teacher from another school',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    404: {
      description: 'Teacher not found',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/grades/{gradeId}/teachers',
  tags: ['Teacher Assignments'],
  summary: 'List all teachers assigned to a grade (Super Admin, School Staff)',
  security: [{ [bearerAuth.name]: [] }],
  request: {
    params: z.object({
      gradeId: z.uuid().openapi({ example: '44444444-4444-4444-a444-444444444444' }),
    }),
  },
  responses: {
    200: {
      description: 'List of teachers assigned to grade',
      content: {
        'application/json': {
          schema: z.object({ data: z.array(TeacherAssignmentSchema) }),
        },
      },
    },
    400: {
      description: 'Invalid grade ID format',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    401: {
      description: 'Authentication required',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    403: {
      description: 'Forbidden: Cannot access grade from another school',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    404: {
      description: 'Grade not found',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/subjects/{subjectId}/teachers',
  tags: ['Teacher Assignments'],
  summary: 'List all teachers assigned to a subject (Super Admin, School Staff)',
  security: [{ [bearerAuth.name]: [] }],
  request: {
    params: z.object({
      subjectId: z.uuid().openapi({ example: '55555555-5555-4555-a555-555555555555' }),
    }),
  },
  responses: {
    200: {
      description: 'List of teachers assigned to subject',
      content: {
        'application/json': {
          schema: z.object({ data: z.array(TeacherAssignmentSchema) }),
        },
      },
    },
    400: {
      description: 'Invalid subject ID format',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    401: {
      description: 'Authentication required',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    403: {
      description: 'Forbidden: Cannot access subject from another school',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    404: {
      description: 'Subject not found',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

// ---------------------------------------------------------------------------
// Document Generator
// ---------------------------------------------------------------------------
export function buildOpenApiDocument() {
  const generator = new OpenApiGeneratorV3(registry.definitions);
  return generator.generateDocument({
    openapi: '3.0.3',
    info: {
      title: 'Learning Matters API',
      version: '1.0.0',
      description:
        'Production-grade REST API backend for Learning Matters with strict TypeScript, Express 5, JWT authentication with rotating refresh tokens, RBAC, and structured observability.',
    },
    servers: [
      {
        url: '/',
        description: 'Current environment server',
      },
    ],
  });
}

export const openApiDocument = buildOpenApiDocument();
