export type BloomLevel = 'understand' | 'apply' | 'analyze' | 'evaluate';

export type ContextNovelty = 'familiar' | 'novel';

export type Difficulty = 'easy' | 'medium' | 'hard';

export type DiagnosticQuadrant =
  'DEEP_MASTER' | 'ROTE_MEMORIZER' | 'INTUITIVE_THINKER' | 'STRUGGLING_LEARNER';

export type QuestionTypeId =
  | 'mcq_single'
  | 'mcq_multi'
  | 'true_false'
  | 'fill_blank'
  | 'match_following'
  | 'order_steps'
  | 'drag_drop_classify'
  | 'numerical'
  | 'identify_error'
  | 'case_based'
  | 'scenario_mcq'
  | 'assertion_reason'
  | 'short_answer'
  | 'code_based'
  | (string & {});

export interface Concept {
  concept_id: string;
  name: string;
  description: string;
  prerequisites?: string[] | undefined;
}

export interface Misconception {
  misconception_id: string;
  concept_id: string;
  name: string;
  description: string;
  teacher_remediation_tip: string;
}

export interface McqOption {
  id: string;
  text: string;
  triggers_misconception_id?: string | null | undefined;
  distractor_rationale?: string | null | undefined;
}

export interface FillBlankItem {
  id: string;
  answer: string;
  accepted_variants?: string[] | undefined;
  common_wrong_answers?:
    | {
        value: string;
        triggers_misconception_id?: string | null;
        rationale?: string;
      }[]
    | undefined;
}

export interface MatchPair {
  left_id: string;
  left_text?: string | undefined;
  right_id: string;
  right_text?: string | undefined;
}

export interface DragDropMapping {
  item_id: string;
  item_text?: string | undefined;
  category_id: string;
  category_name?: string | undefined;
}

export interface CommonWrongNumericalValue {
  value: number | string;
  triggers_misconception_id?: string | null | undefined;
  rationale?: string | undefined;
}

export interface CaseSubQuestion {
  sub_question_id: string;
  sub_type: QuestionTypeId;
  question_text: string;
  marks: number;
  content?: Record<string, unknown> | undefined;
  answer_key?: Record<string, unknown> | undefined;
  explanation?: string | undefined;
  primary_misconception_id?: string | null | undefined;
}

export interface QuestionContent {
  statement?: string | undefined;
  passage?: string | undefined;
  code_snippet?: string | undefined;
  justification_required?: boolean | undefined;
  options?: McqOption[] | undefined;
  text_with_blanks?: string | undefined;
  left_items?: { id: string; text: string }[] | undefined;
  right_items?: { id: string; text: string }[] | undefined;
  steps?: { id: string; text: string; step_number?: number }[] | undefined;
  categories?: { id: string; name: string }[] | undefined;
  items?: { id: string; text: string }[] | undefined;
  problem_statement?: string | undefined;
  sub_questions?: CaseSubQuestion[] | undefined;
  [key: string]: unknown;
}

export interface QuestionAnswerKey {
  correct_option_id?: string | undefined;
  correct_option_ids?: string[] | undefined;
  correct_answer?: boolean | undefined;
  correct_justification?: string | undefined;
  blanks?: FillBlankItem[] | undefined;
  pairs?: MatchPair[] | undefined;
  correct_order?: string[] | undefined;
  mapping?: DragDropMapping[] | undefined;
  correct_value?: number | string | undefined;
  tolerance?:
    | {
        type?: 'absolute' | 'percentage';
        value?: number;
      }
    | undefined;
  common_wrong_values?: CommonWrongNumericalValue[] | undefined;
  error_step_ids?: string[] | undefined;
  marks_split?:
    | {
        locate?: number;
        correct?: number;
      }
    | undefined;
  sample_solution?: string | undefined;
  key_points?: string[] | undefined;
  scoring?:
    | {
        mode?: string;
      }
    | undefined;
  [key: string]: unknown;
}

export interface Question {
  question_id: string;
  type: QuestionTypeId;
  concept_ids: string[];
  primary_misconception_id: string | null;
  context_novelty: ContextNovelty;
  bloom_level: BloomLevel;
  difficulty: Difficulty;
  marks: number;
  estimated_time_sec?: number | undefined;
  question_text: string;
  misconception_targeted?: string | undefined;
  why_tests_understanding?: string | undefined;
  source_evidence?: string | undefined;
  content?: QuestionContent | undefined;
  answer_key?: QuestionAnswerKey | undefined;
  explanation?: string | undefined;
}

export interface AssessmentMeta {
  subject: string;
  grade: string;
  topic: string;
  day_number: number;
  lesson_date: string;
  language?: string | undefined;
  duration_minutes: number;
  total_marks: number;
  question_counts: Record<string, number>;
  skipped_types?: string[] | undefined;
  generation_notes?: string | null | undefined;
  [key: string]: unknown;
}

export interface AssessmentPaper {
  paper_id: string;
  meta: AssessmentMeta;
  concepts: Concept[];
  misconceptions: Misconception[];
  questions: Question[];
}

export interface GeneratePaperInput {
  subject: string;
  grade: string;
  topic: string;
  dayNumber?: number;
  lessonDate?: string;
  durationMinutes?: number;
  totalMarks?: number;
  questionCounts: Record<string, number>;
  teachingMaterial: string;
  priorDaysConcepts?: { concept_id: string; name?: string; description?: string }[];
  priorDaysMisconceptions?: { misconception_id: string; name?: string; description?: string }[];
}

export interface ValidationStats {
  computedMarks: number;
  noveltyRatio: number;
  mcqCorrectDistribution: Record<string, number>;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  stats?: ValidationStats;
}

export interface StudentQuestionResponse {
  selected_option_id?: string;
  selected_option_ids?: string[];
  answer?: boolean;
  justification?: string;
  blanks?: Record<string, string>;
  pairs?: MatchPair[];
  ordered_ids?: string[];
  mapping?: DragDropMapping[];
  value?: number | string;
  error_step_ids?: string[];
  correction?: string;
  sub_responses?: Record<string, StudentQuestionResponse>;
  [key: string]: unknown;
}

export interface StudentSubmission {
  student_id?: string;
  responses?: Record<string, StudentQuestionResponse>;
}

export interface GradeResult {
  marksAwarded: number;
  triggeredMisconceptionId: string | null;
}

export interface EvaluationDiagnostics {
  recall_accuracy_pct: number;
  conceptual_accuracy_pct: number;
  rote_vs_concept_delta: number;
  knowledge_transfer_index: number;
  quadrant: DiagnosticQuadrant;
  concept_mastery_map: Record<string, { earned: number; total: number }>;
  triggered_misconceptions: {
    misconception_id: string;
    question_id: string;
    concept_ids?: string[];
  }[];
}

export interface EvaluationReport {
  student_id?: string;
  total_score: number;
  max_score: number;
  diagnostics: EvaluationDiagnostics;
}

export interface QuestionTypeConfigEntry {
  id: string;
  label: string;
  description: string;
  default_marks: number;
  est_time_sec: number;
  weight: number;
  grading: 'auto' | 'hybrid' | 'manual';
  eligibility: string | null;
  rules: string[];
  content_example: Record<string, unknown>;
  answer_key_example: Record<string, unknown>;
  response_example?: Record<string, unknown>;
}

export interface QuestionTypesConfigFile {
  version: string;
  bloom_allowed: string[];
  case_sub_types: string[];
  types: QuestionTypeConfigEntry[];
}
