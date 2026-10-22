import type {
  AssessmentPaper,
  DiagnosticQuadrant,
  EvaluationReport,
  GradeResult,
  Question,
  StudentQuestionResponse,
  StudentSubmission,
} from '../assessment.types.js';

/**
 * Deterministic Auto-Grader & Concept Analytics Service
 * Grades all question types and computes the 6 Teacher Dashboard Parameters.
 */

export function normalizeStr(str: unknown): string {
  if (typeof str === 'string') {
    return str.trim().toLowerCase().replace(/\s+/g, ' ');
  }
  if (typeof str === 'number' || typeof str === 'boolean') {
    return String(str).trim().toLowerCase().replace(/\s+/g, ' ');
  }
  return '';
}

export function gradeSingleQuestion(
  q: Question,
  resp?: StudentQuestionResponse | null,
): GradeResult {
  if (!resp) {
    return { marksAwarded: 0, triggeredMisconceptionId: q.primary_misconception_id ?? null };
  }

  const maxMarks = q.marks > 0 ? q.marks : 1;

  switch (q.type) {
    case 'mcq_single':
    case 'scenario_mcq':
    case 'assertion_reason': {
      const isCorrect = resp.selected_option_id === q.answer_key?.correct_option_id;
      if (isCorrect) return { marksAwarded: maxMarks, triggeredMisconceptionId: null };
      const chosenOpt = (q.content?.options ?? []).find((o) => o.id === resp.selected_option_id);
      return {
        marksAwarded: 0,
        triggeredMisconceptionId:
          chosenOpt?.triggers_misconception_id ?? q.primary_misconception_id ?? null,
      };
    }

    case 'mcq_multi': {
      const correctSet = new Set(q.answer_key?.correct_option_ids ?? []);
      const selected = resp.selected_option_ids ?? [];
      let rightCount = 0;
      let wrongCount = 0;
      let firstMisconception: string | null = null;

      for (const id of selected) {
        if (correctSet.has(id)) {
          rightCount++;
        } else {
          wrongCount++;
          const opt = (q.content?.options ?? []).find((o) => o.id === id);
          if (!firstMisconception && opt?.triggers_misconception_id) {
            firstMisconception = opt.triggers_misconception_id;
          }
        }
      }
      const rawRatio = correctSet.size > 0 ? (rightCount - wrongCount) / correctSet.size : 0;
      const score = Math.max(0, +(rawRatio * maxMarks).toFixed(2));
      return {
        marksAwarded: score,
        triggeredMisconceptionId:
          score < maxMarks ? (firstMisconception ?? q.primary_misconception_id) : null,
      };
    }

    case 'true_false': {
      const boolMatch = resp.answer === q.answer_key?.correct_answer;
      return {
        marksAwarded: boolMatch ? maxMarks : 0,
        triggeredMisconceptionId: boolMatch ? null : (q.primary_misconception_id ?? null),
      };
    }

    case 'fill_blank': {
      const blanks = q.answer_key?.blanks ?? [];
      if (blanks.length === 0) return { marksAwarded: 0, triggeredMisconceptionId: null };
      let correctBlanks = 0;
      let detectedMisconception: string | null = null;

      for (const b of blanks) {
        const studentVal = normalizeStr(resp.blanks?.[b.id]);
        const accepted = [b.answer, ...(b.accepted_variants ?? [])].map(normalizeStr);
        if (accepted.includes(studentVal)) {
          correctBlanks++;
        } else {
          const wrongMatch = (b.common_wrong_answers ?? []).find(
            (w) => normalizeStr(w.value) === studentVal,
          );
          if (wrongMatch?.triggers_misconception_id) {
            detectedMisconception = wrongMatch.triggers_misconception_id;
          }
        }
      }

      const marksAwarded = +((correctBlanks / blanks.length) * maxMarks).toFixed(2);
      return {
        marksAwarded,
        triggeredMisconceptionId:
          marksAwarded < maxMarks ? (detectedMisconception ?? q.primary_misconception_id) : null,
      };
    }

    case 'match_following': {
      const keyPairs = q.answer_key?.pairs ?? [];
      const studentPairs = resp.pairs ?? [];
      if (keyPairs.length === 0) return { marksAwarded: 0, triggeredMisconceptionId: null };
      let matched = 0;
      for (const kp of keyPairs) {
        const found = studentPairs.some(
          (sp) => sp.left_id === kp.left_id && sp.right_id === kp.right_id,
        );
        if (found) matched++;
      }
      const marksAwarded = +((matched / keyPairs.length) * maxMarks).toFixed(2);
      return {
        marksAwarded,
        triggeredMisconceptionId: marksAwarded < maxMarks ? q.primary_misconception_id : null,
      };
    }

    case 'order_steps': {
      const correctOrder = q.answer_key?.correct_order ?? [];
      const studentOrder = resp.ordered_ids ?? [];
      if (correctOrder.length < 2) return { marksAwarded: 0, triggeredMisconceptionId: null };
      const totalAdjacent = correctOrder.length - 1;
      let correctAdjacent = 0;

      for (let i = 0; i < totalAdjacent; i++) {
        const pairA = correctOrder[i];
        const pairB = correctOrder[i + 1];
        if (pairA === undefined || pairB === undefined) continue;
        const idxA = studentOrder.indexOf(pairA);
        if (idxA !== -1 && studentOrder[idxA + 1] === pairB) {
          correctAdjacent++;
        }
      }
      const marksAwarded = +((correctAdjacent / totalAdjacent) * maxMarks).toFixed(2);
      return {
        marksAwarded,
        triggeredMisconceptionId: marksAwarded < maxMarks ? q.primary_misconception_id : null,
      };
    }

    case 'drag_drop_classify': {
      const keyMapping = q.answer_key?.mapping ?? [];
      const studentMapping = resp.mapping ?? [];
      if (keyMapping.length === 0) return { marksAwarded: 0, triggeredMisconceptionId: null };
      let correctItems = 0;
      for (const km of keyMapping) {
        const match = studentMapping.some(
          (sm) => sm.item_id === km.item_id && sm.category_id === km.category_id,
        );
        if (match) correctItems++;
      }
      const marksAwarded = +((correctItems / keyMapping.length) * maxMarks).toFixed(2);
      return {
        marksAwarded,
        triggeredMisconceptionId: marksAwarded < maxMarks ? q.primary_misconception_id : null,
      };
    }

    case 'numerical': {
      const studentNum = Number(resp.value);
      const targetNum = Number(q.answer_key?.correct_value);
      const tol = q.answer_key?.tolerance?.value ?? 0.01;
      const isCorrect = !Number.isNaN(studentNum) && Math.abs(studentNum - targetNum) <= tol;
      if (isCorrect) return { marksAwarded: maxMarks, triggeredMisconceptionId: null };

      const wrongHit = (q.answer_key?.common_wrong_values ?? []).find(
        (w) => Math.abs(Number(w.value) - studentNum) <= tol,
      );
      return {
        marksAwarded: 0,
        triggeredMisconceptionId:
          wrongHit?.triggers_misconception_id ?? q.primary_misconception_id ?? null,
      };
    }

    case 'identify_error': {
      const keySteps = q.answer_key?.error_step_ids ?? [];
      const studentSteps = resp.error_step_ids ?? [];
      const located = keySteps.length > 0 && keySteps.every((id) => studentSteps.includes(id));
      const locateMarks = located ? (q.answer_key?.marks_split?.locate ?? 1) : 0;
      const correctMarks =
        located && resp.correction && normalizeStr(resp.correction).length > 3
          ? (q.answer_key?.marks_split?.correct ?? 1)
          : 0;
      const total = locateMarks + correctMarks;
      return {
        marksAwarded: total,
        triggeredMisconceptionId: total < maxMarks ? q.primary_misconception_id : null,
      };
    }

    case 'case_based': {
      let subTotalEarned = 0;
      let firstMisconception: string | null = null;
      for (const sq of q.content?.sub_questions ?? []) {
        const subResp = resp.sub_responses?.[sq.sub_question_id];
        const pseudoQuestion: Question = {
          question_id: sq.sub_question_id,
          type: sq.sub_type,
          marks: sq.marks,
          question_text: sq.question_text,
          primary_misconception_id: q.primary_misconception_id,
          concept_ids: q.concept_ids,
          context_novelty: q.context_novelty,
          bloom_level: q.bloom_level,
          difficulty: q.difficulty,
          ...(sq.content !== undefined ? { content: sq.content } : {}),
          ...(sq.answer_key !== undefined ? { answer_key: sq.answer_key } : {}),
          ...(sq.explanation !== undefined ? { explanation: sq.explanation } : {}),
        };
        const subResult = gradeSingleQuestion(pseudoQuestion, subResp);
        subTotalEarned += subResult.marksAwarded;
        if (!firstMisconception && subResult.triggeredMisconceptionId) {
          firstMisconception = subResult.triggeredMisconceptionId;
        }
      }
      return {
        marksAwarded: +subTotalEarned.toFixed(2),
        triggeredMisconceptionId: firstMisconception,
      };
    }

    default:
      return { marksAwarded: 0, triggeredMisconceptionId: null };
  }
}

export function evaluateStudentSubmission(
  paper: AssessmentPaper,
  studentSubmission: StudentSubmission,
): EvaluationReport {
  let recallMarksEarned = 0;
  let recallMarksTotal = 0;
  let conceptMarksEarned = 0;
  let conceptMarksTotal = 0;
  let novelMarksEarned = 0;
  let novelMarksTotal = 0;

  const triggeredMisconceptions: {
    misconception_id: string;
    question_id: string;
    concept_ids?: string[];
  }[] = [];
  const conceptScores: Record<string, { earned: number; total: number }> = {};

  for (const q of paper.questions) {
    const resp = studentSubmission.responses?.[q.question_id];
    const { marksAwarded, triggeredMisconceptionId } = gradeSingleQuestion(q, resp);

    if (q.bloom_level === 'understand') {
      recallMarksTotal += q.marks;
      recallMarksEarned += marksAwarded;
    } else {
      conceptMarksTotal += q.marks;
      conceptMarksEarned += marksAwarded;
    }

    if (q.context_novelty === 'novel') {
      novelMarksTotal += q.marks;
      novelMarksEarned += marksAwarded;
    }

    for (const cid of q.concept_ids) {
      const existing = conceptScores[cid] ?? { earned: 0, total: 0 };
      existing.total += q.marks;
      existing.earned = +(existing.earned + marksAwarded).toFixed(2);
      conceptScores[cid] = existing;
    }

    if (triggeredMisconceptionId) {
      triggeredMisconceptions.push({
        misconception_id: triggeredMisconceptionId,
        question_id: q.question_id,
        concept_ids: q.concept_ids,
      });
    }
  }

  const recallPct =
    recallMarksTotal > 0 ? Math.round((recallMarksEarned / recallMarksTotal) * 100) : 0;
  const conceptPct =
    conceptMarksTotal > 0 ? Math.round((conceptMarksEarned / conceptMarksTotal) * 100) : 0;
  const transferPct =
    novelMarksTotal > 0 ? Math.round((novelMarksEarned / novelMarksTotal) * 100) : 0;

  let quadrant: DiagnosticQuadrant = 'STRUGGLING_LEARNER';
  if (recallPct >= 65 && conceptPct >= 65) quadrant = 'DEEP_MASTER';
  else if (recallPct >= 65 && conceptPct < 65) quadrant = 'ROTE_MEMORIZER';
  else if (recallPct < 65 && conceptPct >= 65) quadrant = 'INTUITIVE_THINKER';

  const report: EvaluationReport = {
    total_score: +(recallMarksEarned + conceptMarksEarned).toFixed(2),
    max_score: recallMarksTotal + conceptMarksTotal,
    diagnostics: {
      recall_accuracy_pct: recallPct,
      conceptual_accuracy_pct: conceptPct,
      rote_vs_concept_delta: recallPct - conceptPct,
      knowledge_transfer_index: transferPct,
      quadrant,
      concept_mastery_map: conceptScores,
      triggered_misconceptions: triggeredMisconceptions,
    },
  };

  if (studentSubmission.student_id !== undefined) {
    report.student_id = studentSubmission.student_id;
  }

  return report;
}
