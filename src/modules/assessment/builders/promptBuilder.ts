import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { GeneratePaperInput, QuestionTypesConfigFile } from '../assessment.types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const questionTypesConfigPath = path.join(__dirname, '..', 'config', 'questionTypes.v2.json');
const envelopeSchemaPath = path.join(__dirname, '..', 'config', 'envelopeSchema.json');

const questionTypesConfig = JSON.parse(
  fs.readFileSync(questionTypesConfigPath, 'utf-8'),
) as QuestionTypesConfigFile;

const envelopeSchema = JSON.parse(fs.readFileSync(envelopeSchemaPath, 'utf-8')) as Record<
  string,
  unknown
>;

export const PROMPT_FILE_MAP: Record<string, string> = {
  math: 'stem.system.md',
  mathematics: 'stem.system.md',
  physics: 'stem.system.md',
  chemistry: 'stem.system.md',
  biology: 'stem.system.md',
  science: 'stem.system.md',
  coding: 'stem.system.md',
  computer_science: 'stem.system.md',
  history: 'social.system.md',
  civics: 'social.system.md',
  political_science: 'social.system.md',
  geography: 'social.system.md',
  economics: 'social.system.md',
  social_science: 'social.system.md',
  english: 'literature.system.md',
  hindi: 'literature.system.md',
  literature: 'literature.system.md',
};

export function buildTypeModulesBlock(questionCounts: Record<string, number>): string {
  const requestedTypeIds = Object.keys(questionCounts).filter(
    (typeId) => (questionCounts[typeId] ?? 0) > 0,
  );

  const modulesText = requestedTypeIds.map((typeId, index) => {
    const typeSpec = questionTypesConfig.types.find((t) => t.id === typeId);
    if (!typeSpec) {
      throw new Error(`Unsupported question type requested: ${typeId}`);
    }

    const count = questionCounts[typeId] ?? 0;
    return [
      `### ${String(index + 1)}. ${typeSpec.label} (type: "${typeSpec.id}") — Generate EXACTLY ${String(count)} question(s)`,
      `- Default marks per question: ${String(typeSpec.default_marks)} | Est. time: ${String(typeSpec.est_time_sec)}s`,
      `- Rules:`,
      ...typeSpec.rules.map((r) => `  * ${r}`),
      `- Required "content" shape: ${JSON.stringify(typeSpec.content_example)}`,
      `- Required "answer_key" shape: ${JSON.stringify(typeSpec.answer_key_example)}`,
    ].join('\n');
  });

  return modulesText.join('\n\n');
}

export function buildPrompts({
  subject,
  grade,
  topic,
  dayNumber = 1,
  lessonDate,
  durationMinutes = 30,
  totalMarks = 25,
  questionCounts,
  teachingMaterial,
  priorDaysConcepts = [],
  priorDaysMisconceptions = [],
}: GeneratePaperInput): { systemInstruction: string; userPrompt: string } {
  const normalizedSubject = subject.trim().toLowerCase().replace(/\s+/g, '_');
  const promptFile = PROMPT_FILE_MAP[normalizedSubject] ?? 'stem.system.md';
  const promptFilePath = path.join(__dirname, '..', 'prompts', promptFile);
  const rawSystemPrompt = fs.readFileSync(promptFilePath, 'utf-8');

  const typeModulesStr = buildTypeModulesBlock(questionCounts);
  const envelopeStr = JSON.stringify(envelopeSchema, null, 2);

  const systemInstruction = rawSystemPrompt
    .replace('{{TYPE_MODULES}}', typeModulesStr)
    .replace('{{ENVELOPE}}', envelopeStr);

  const userPayload = {
    meta: {
      subject,
      grade,
      topic,
      day_number: dayNumber,
      lesson_date: lessonDate ?? new Date().toISOString().split('T')[0] ?? '',
      duration_minutes: durationMinutes,
      total_marks: totalMarks,
      question_counts: questionCounts,
    },
    prior_days_concepts: priorDaysConcepts,
    prior_days_misconceptions: priorDaysMisconceptions,
    teaching_material: teachingMaterial,
  };

  return {
    systemInstruction,
    userPrompt: JSON.stringify(userPayload, null, 2),
  };
}
