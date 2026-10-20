import { z } from 'zod';

export const generatePaperSchema = z.object({
  subject: z.string().trim().min(1, 'Subject is required'),
  grade: z.string().trim().min(1, 'Grade is required'),
  topic: z.string().trim().min(1, 'Topic is required'),
  dayNumber: z.number().int().positive().optional().default(1),
  lessonDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'lessonDate must be YYYY-MM-DD')
    .optional(),
  durationMinutes: z.number().int().positive().optional().default(30),
  totalMarks: z.number().int().positive().optional().default(25),
  questionCounts: z
    .record(z.string(), z.number().int().nonnegative())
    .refine(
      (counts) => Object.values(counts).reduce((sum, val) => sum + val, 0) > 0,
      'At least one question must be requested in questionCounts',
    ),
  teachingMaterial: z.string().trim().min(10, 'Teaching material must be at least 10 characters'),
  priorDaysConcepts: z
    .array(
      z.object({
        concept_id: z.string(),
        name: z.string().optional(),
        description: z.string().optional(),
      }),
    )
    .optional()
    .default([]),
  priorDaysMisconceptions: z
    .array(
      z.object({
        misconception_id: z.string(),
        name: z.string().optional(),
        description: z.string().optional(),
      }),
    )
    .optional()
    .default([]),
});

export const evaluateSubmissionSchema = z.object({
  paper: z.object({
    paper_id: z.string().optional(),
    meta: z.record(z.string(), z.unknown()).optional(),
    concepts: z.array(z.record(z.string(), z.unknown())).optional(),
    misconceptions: z.array(z.record(z.string(), z.unknown())).optional(),
    questions: z.array(z.record(z.string(), z.unknown())),
  }),
  studentSubmission: z.object({
    student_id: z.string().optional(),
    responses: z.record(z.string(), z.record(z.string(), z.unknown())).optional(),
  }),
});
