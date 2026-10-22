import { describe, it, expect, vi } from 'vitest';
import { validateGeneratedPaper } from './validators/paperValidator.js';
import { buildPrompts, buildTypeModulesBlock } from './builders/promptBuilder.js';
import {
  gradeSingleQuestion,
  evaluateStudentSubmission,
  normalizeStr,
} from './services/analytics.service.js';
import {
  AssessmentController,
  handleGeneratePaper,
  handleEvaluateSubmission,
} from './assessment.controller.js';
import type {
  AssessmentPaper,
  GeneratePaperInput,
  Question,
  StudentSubmission,
} from './assessment.types.js';
import type { Request, Response } from 'express';

describe('Assessment Module - Unit Tests', () => {
  const samplePaper: AssessmentPaper = {
    paper_id: 'test_chem_10',
    meta: {
      subject: 'chemistry',
      grade: '10',
      topic: 'Chemical Reactions and Equations',
      day_number: 1,
      lesson_date: '2026-10-28',
      duration_minutes: 30,
      total_marks: 10,
      question_counts: {
        mcq_single: 2,
        true_false: 1,
        fill_blank: 1,
      },
    },
    concepts: [
      {
        concept_id: 'D1_C1',
        name: 'Law of Conservation of Mass',
        description: 'Atoms are neither created nor destroyed',
      },
      {
        concept_id: 'D1_C2',
        name: 'Balancing Chemical Equations',
        description: 'Using stoichiometric coefficients',
      },
    ],
    misconceptions: [
      {
        misconception_id: 'D1_M1',
        concept_id: 'D1_C1',
        name: 'Changing Subscripts',
        description: 'Student alters chemical formula instead of coefficient',
        teacher_remediation_tip: 'Remind that subscripts change the identity of substance',
      },
      {
        misconception_id: 'D1_M2',
        concept_id: 'D1_C2',
        name: 'Additive Coefficients',
        description: 'Student adds coefficients instead of multiplying atoms',
        teacher_remediation_tip: 'Use bracket diagrams to show multiplication',
      },
    ],
    questions: [
      {
        question_id: 'Q1',
        type: 'mcq_single',
        concept_ids: ['D1_C1'],
        primary_misconception_id: 'D1_M1',
        context_novelty: 'novel',
        bloom_level: 'apply',
        difficulty: 'medium',
        marks: 2,
        question_text: 'Which is balanced correctly for iron rust formation?',
        content: {
          options: [
            { id: 'A', text: 'Option A', triggers_misconception_id: 'D1_M1' },
            { id: 'B', text: 'Option B' },
            { id: 'C', text: 'Option C', triggers_misconception_id: 'D1_M2' },
            { id: 'D', text: 'Option D' },
          ],
        },
        answer_key: {
          correct_option_id: 'B',
        },
      },
      {
        question_id: 'Q2',
        type: 'true_false',
        concept_ids: ['D1_C1'],
        primary_misconception_id: 'D1_M1',
        context_novelty: 'familiar',
        bloom_level: 'understand',
        difficulty: 'easy',
        marks: 2,
        question_text: 'Coefficients multiply all atoms in a molecule.',
        answer_key: {
          correct_answer: true,
        },
      },
      {
        question_id: 'Q3',
        type: 'fill_blank',
        concept_ids: ['D1_C2'],
        primary_misconception_id: 'D1_M2',
        context_novelty: 'novel',
        bloom_level: 'apply',
        difficulty: 'medium',
        marks: 2,
        question_text: 'The coefficient in front of O2 is [b1].',
        content: {},
        answer_key: {
          blanks: [
            {
              id: 'b1',
              answer: '3',
              accepted_variants: ['three'],
              common_wrong_answers: [{ value: '2', triggers_misconception_id: 'D1_M2' }],
            },
          ],
        },
      },
      {
        question_id: 'Q4',
        type: 'case_based',
        concept_ids: ['D1_C1', 'D1_C2'],
        primary_misconception_id: 'D1_M1',
        context_novelty: 'novel',
        bloom_level: 'analyze',
        difficulty: 'hard',
        marks: 4,
        question_text: 'Analyze the industrial Haber process case.',
        content: {
          sub_questions: [
            {
              sub_question_id: 'Q4_1',
              sub_type: 'mcq_single',
              marks: 2,
              question_text: 'What is reactant ratio?',
              answer_key: { correct_option_id: 'A' },
            },
            {
              sub_question_id: 'Q4_2',
              sub_type: 'true_false',
              marks: 2,
              question_text: 'Is mass conserved?',
              answer_key: { correct_answer: true },
            },
          ],
        },
      },
    ],
  };

  describe('paperValidator', () => {
    it('validates a compliant paper successfully', () => {
      const result = validateGeneratedPaper(samplePaper, { totalMarks: 10 });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.stats?.computedMarks).toBe(10);
      expect(result.stats?.noveltyRatio).toBe(0.75);
      expect(result.stats?.mcqCorrectDistribution.B).toBe(1);
    });

    it('returns error when output is not an object', () => {
      const result = validateGeneratedPaper(null, { totalMarks: 10 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Output is not a valid JSON object');
    });

    it('rejects paper with fewer than 2 concepts or misconceptions', () => {
      const firstConcept = samplePaper.concepts[0];
      if (!firstConcept) throw new Error('Fixture missing concepts');
      const invalidPaper = {
        ...samplePaper,
        concepts: [firstConcept],
        misconceptions: [],
      };
      const result = validateGeneratedPaper(invalidPaper);
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          'Paper must extract at least 2 atomic concepts in top-level "concepts" array.',
          'Paper must extract at least 2 misconceptions in top-level "misconceptions" array.',
        ]),
      );
    });

    it('rejects paper with marks mismatch', () => {
      const result = validateGeneratedPaper(samplePaper, { totalMarks: 25 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Total marks mismatch: expected 25, got 10');
    });

    it('flags case question where sub_question marks do not sum to total', () => {
      const q4 = samplePaper.questions[3];
      if (!q4) throw new Error('Fixture missing question 4');
      const flawedPaper: AssessmentPaper = {
        ...samplePaper,
        questions: [
          ...samplePaper.questions.slice(0, 3),
          {
            ...q4,
            marks: 5, // sub questions sum to 4
          },
        ],
      };
      const result = validateGeneratedPaper(flawedPaper);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('!= sum of sub_questions'))).toBe(true);
    });

    it('flags unknown concept_id references', () => {
      const q1 = samplePaper.questions[0];
      if (!q1) throw new Error('Fixture missing question 1');
      const flawedPaper: AssessmentPaper = {
        ...samplePaper,
        questions: [
          {
            ...q1,
            concept_ids: ['UNKNOWN_CID'],
          },
        ],
      };
      const result = validateGeneratedPaper(flawedPaper);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('unknown concept_id "UNKNOWN_CID"'))).toBe(true);
    });
  });

  describe('promptBuilder', () => {
    it('buildsTypeModulesBlock correctly for valid question counts', () => {
      const block = buildTypeModulesBlock({
        mcq_single: 3,
        true_false: 2,
      });
      expect(block).toContain('Single-Answer MCQ');
      expect(block).toContain('True or False');
      expect(block).toContain('Generate EXACTLY 3 question(s)');
      expect(block).toContain('Generate EXACTLY 2 question(s)');
    });

    it('throws error for unsupported question types', () => {
      expect(() =>
        buildTypeModulesBlock({
          unknown_nonexistent_type: 2,
        }),
      ).toThrow('Unsupported question type requested: unknown_nonexistent_type');
    });

    it('builds system and user prompts with expected placeholders replaced', () => {
      const input: GeneratePaperInput = {
        subject: 'chemistry',
        grade: '10',
        topic: 'Acids and Bases',
        questionCounts: {
          mcq_single: 2,
        },
        teachingMaterial: 'Acids produce hydrogen ions in water and turn blue litmus red.',
      };

      const { systemInstruction, userPrompt } = buildPrompts(input);
      expect(systemInstruction).toContain('STEM assessment architect');
      expect(systemInstruction).not.toContain('{{TYPE_MODULES}}');
      expect(systemInstruction).not.toContain('{{ENVELOPE}}');

      const parsedPayload = JSON.parse(userPrompt) as {
        meta: { subject: string; grade: string };
        teaching_material: string;
      };
      expect(parsedPayload.meta.subject).toBe('chemistry');
      expect(parsedPayload.teaching_material).toContain('Acids produce hydrogen');
    });

    it('selects literature prompt for english and social prompt for history', () => {
      const litPrompt = buildPrompts({
        subject: 'english',
        grade: '9',
        topic: 'Poetry',
        questionCounts: { mcq_single: 1 },
        teachingMaterial: 'Metaphor and simile discussion.',
      });
      expect(litPrompt.systemInstruction).toContain('Language and Literature');

      const socPrompt = buildPrompts({
        subject: 'history',
        grade: '8',
        topic: 'Industrial Revolution',
        questionCounts: { mcq_single: 1 },
        teachingMaterial: 'Steam engine development.',
      });
      expect(socPrompt.systemInstruction).toContain('Social Sciences');
    });
  });

  describe('analytics.service', () => {
    it('normalizes strings properly', () => {
      expect(normalizeStr('  Hello   World  ')).toBe('hello world');
      expect(normalizeStr(123)).toBe('123');
      expect(normalizeStr(null)).toBe('');
      expect(normalizeStr(undefined)).toBe('');
    });

    it('grades mcq_single: correct and incorrect distractor triggering', () => {
      const q = samplePaper.questions[0];
      if (!q) throw new Error('Fixture missing question 1');
      // Correct
      const correctRes = gradeSingleQuestion(q, { selected_option_id: 'B' });
      expect(correctRes.marksAwarded).toBe(2);
      expect(correctRes.triggeredMisconceptionId).toBeNull();

      // Wrong with known misconception
      const wrongRes = gradeSingleQuestion(q, { selected_option_id: 'A' });
      expect(wrongRes.marksAwarded).toBe(0);
      expect(wrongRes.triggeredMisconceptionId).toBe('D1_M1');

      // No response
      const noRes = gradeSingleQuestion(q, null);
      expect(noRes.marksAwarded).toBe(0);
      expect(noRes.triggeredMisconceptionId).toBe('D1_M1');
    });

    it('grades mcq_multi with partial scoring and distractor trigger', () => {
      const q: Question = {
        question_id: 'QM1',
        type: 'mcq_multi',
        concept_ids: ['D1_C1'],
        primary_misconception_id: 'D1_M1',
        context_novelty: 'novel',
        bloom_level: 'apply',
        difficulty: 'medium',
        marks: 4,
        question_text: 'Select all',
        content: {
          options: [
            { id: 'A', text: 'Opt A' },
            { id: 'B', text: 'Opt B', triggers_misconception_id: 'D1_M2' },
            { id: 'C', text: 'Opt C' },
          ],
        },
        answer_key: {
          correct_option_ids: ['A', 'C'],
        },
      };

      // Both correct selected
      const full = gradeSingleQuestion(q, { selected_option_ids: ['A', 'C'] });
      expect(full.marksAwarded).toBe(4);
      expect(full.triggeredMisconceptionId).toBeNull();

      // One correct, one distractor
      const partial = gradeSingleQuestion(q, { selected_option_ids: ['A', 'B'] });
      expect(partial.marksAwarded).toBe(0);
      expect(partial.triggeredMisconceptionId).toBe('D1_M2');
    });

    it('grades fill_blank with variants and common wrong answers', () => {
      const q = samplePaper.questions[2];
      if (!q) throw new Error('Fixture missing question 3');
      // exact match
      expect(gradeSingleQuestion(q, { blanks: { b1: '3' } }).marksAwarded).toBe(2);
      // variant
      expect(gradeSingleQuestion(q, { blanks: { b1: 'THREE' } }).marksAwarded).toBe(2);
      // common wrong answer
      const wrong = gradeSingleQuestion(q, { blanks: { b1: '2' } });
      expect(wrong.marksAwarded).toBe(0);
      expect(wrong.triggeredMisconceptionId).toBe('D1_M2');
    });

    it('grades match_following, order_steps, and numerical', () => {
      const matchQ: Question = {
        question_id: 'MF1',
        type: 'match_following',
        concept_ids: ['D1_C1'],
        primary_misconception_id: 'D1_M1',
        context_novelty: 'novel',
        bloom_level: 'apply',
        difficulty: 'medium',
        marks: 2,
        question_text: 'Match pairs',
        answer_key: {
          pairs: [
            { left_id: 'L1', right_id: 'R1' },
            { left_id: 'L2', right_id: 'R2' },
          ],
        },
      };
      const matchRes = gradeSingleQuestion(matchQ, {
        pairs: [{ left_id: 'L1', right_id: 'R1' }],
      });
      expect(matchRes.marksAwarded).toBe(1);

      const numQ: Question = {
        question_id: 'NUM1',
        type: 'numerical',
        concept_ids: ['D1_C1'],
        primary_misconception_id: 'D1_M1',
        context_novelty: 'novel',
        bloom_level: 'apply',
        difficulty: 'medium',
        marks: 3,
        question_text: 'Calculate value',
        answer_key: {
          correct_value: 10.5,
          tolerance: { value: 0.1 },
        },
      };
      expect(gradeSingleQuestion(numQ, { value: '10.55' }).marksAwarded).toBe(3);
      expect(gradeSingleQuestion(numQ, { value: '12' }).marksAwarded).toBe(0);
    });

    it('evaluates student submission and produces comprehensive diagnostics and quadrant', () => {
      const submission: StudentSubmission = {
        student_id: 'student_123',
        responses: {
          Q1: { selected_option_id: 'B' }, // 2 marks, concept, novel
          Q2: { answer: true }, // 2 marks, recall, familiar
          Q3: { blanks: { b1: '3' } }, // 2 marks, concept, novel
          Q4: {
            sub_responses: {
              Q4_1: { selected_option_id: 'A' }, // 2 marks
              Q4_2: { answer: true }, // 2 marks
            },
          }, // total 4 marks
        },
      };

      const report = evaluateStudentSubmission(samplePaper, submission);
      expect(report.student_id).toBe('student_123');
      expect(report.total_score).toBe(10);
      expect(report.max_score).toBe(10);
      expect(report.diagnostics.recall_accuracy_pct).toBe(100);
      expect(report.diagnostics.conceptual_accuracy_pct).toBe(100);
      expect(report.diagnostics.quadrant).toBe('DEEP_MASTER');
      expect(report.diagnostics.concept_mastery_map.D1_C1?.earned).toBe(8);
    });
  });

  describe('assessment.controller', () => {
    it('handleEvaluateSubmission processes submission and returns 200', () => {
      const req = {
        body: {
          paper: samplePaper,
          studentSubmission: {
            student_id: 'stu_1',
            responses: {
              Q1: { selected_option_id: 'B' },
            },
          },
        },
      } as unknown as Request;

      let responseStatus = 0;
      let responseBody: unknown;

      const res = {
        status: (s: number) => {
          responseStatus = s;
          return {
            json: (data: unknown) => {
              responseBody = data;
              return res;
            },
          };
        },
      } as unknown as Response;

      handleEvaluateSubmission(req, res);
      expect(responseStatus).toBe(200);
      expect((responseBody as { success: boolean }).success).toBe(true);
    });

    it('AssessmentController.evaluateSubmission calls next(error) on invalid structure', () => {
      const controller = new AssessmentController();
      const req = {
        body: {},
      } as Request;

      const next = vi.fn();
      const res = {} as Response;

      controller.evaluateSubmission(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('handleGeneratePaper returns 400 when GEMINI_API_KEY is not configured', async () => {
      const req = {
        body: {
          subject: 'chemistry',
          grade: '10',
          topic: 'Rusting',
          questionCounts: { mcq_single: 1 },
          teachingMaterial: 'Test material here',
        },
      } as Request;

      let responseStatus = 0;
      let responseBody: unknown;

      const res = {
        status: (s: number) => {
          responseStatus = s;
          return {
            json: (data: unknown) => {
              responseBody = data;
              return res;
            },
          };
        },
      } as unknown as Response;

      await handleGeneratePaper(req, res);
      expect(responseStatus).toBe(400);
      expect((responseBody as { success: boolean; message: string }).success).toBe(false);
    });
  });
});
