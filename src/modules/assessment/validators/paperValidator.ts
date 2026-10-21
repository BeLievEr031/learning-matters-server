import type { AssessmentPaper, GeneratePaperInput, ValidationResult } from '../assessment.types.js';

export function validateGeneratedPaper(
  paper: AssessmentPaper | Record<string, unknown> | null | undefined,
  requestedMeta: Partial<GeneratePaperInput> = {},
): ValidationResult {
  const errors: string[] = [];

  if (!paper || typeof paper !== 'object') {
    return { valid: false, errors: ['Output is not a valid JSON object'] };
  }

  const typedPaper = paper as Partial<AssessmentPaper>;
  const validConceptIds = new Set((typedPaper.concepts ?? []).map((c) => c.concept_id));
  const validMisconceptionIds = new Set(
    (typedPaper.misconceptions ?? []).map((m) => m.misconception_id),
  );

  if (validConceptIds.size < 2) {
    errors.push('Paper must extract at least 2 atomic concepts in top-level "concepts" array.');
  }
  if (validMisconceptionIds.size < 2) {
    errors.push(
      'Paper must extract at least 2 misconceptions in top-level "misconceptions" array.',
    );
  }

  let computedMarks = 0;
  let novelCount = 0;
  const mcqCorrectDistribution: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 };

  for (const q of typedPaper.questions ?? []) {
    computedMarks += q.marks;
    if (q.context_novelty === 'novel') novelCount++;

    for (const cid of q.concept_ids) {
      if (!validConceptIds.has(cid) && !cid.startsWith('D')) {
        errors.push(`Question ${q.question_id} references unknown concept_id "${cid}"`);
      }
    }

    if (q.type === 'mcq_single' || q.type === 'scenario_mcq') {
      const ans = q.answer_key?.correct_option_id;
      if (ans && Object.prototype.hasOwnProperty.call(mcqCorrectDistribution, ans)) {
        mcqCorrectDistribution[ans] = (mcqCorrectDistribution[ans] ?? 0) + 1;
      }
    }

    if (q.type === 'case_based') {
      const subQuestions = (q.content?.sub_questions ?? []) as { marks?: number }[];
      const subSum = subQuestions.reduce((sum: number, sq) => sum + (sq.marks ?? 0), 0);
      if (subSum !== q.marks) {
        errors.push(
          `Case question ${q.question_id} marks (${String(q.marks)}) != sum of sub_questions (${String(subSum)})`,
        );
      }
    }
  }

  if (requestedMeta.totalMarks !== undefined && computedMarks !== requestedMeta.totalMarks) {
    errors.push(
      `Total marks mismatch: expected ${String(requestedMeta.totalMarks)}, got ${String(computedMarks)}`,
    );
  }

  const questionCount = typedPaper.questions?.length ?? 0;

  return {
    valid: errors.length === 0,
    errors,
    stats: {
      computedMarks,
      noveltyRatio: questionCount > 0 ? +(novelCount / questionCount).toFixed(2) : 0,
      mcqCorrectDistribution,
    },
  };
}
