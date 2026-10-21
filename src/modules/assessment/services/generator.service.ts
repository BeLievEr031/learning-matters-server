import { GoogleGenAI } from '@google/genai';
import { buildPrompts } from '../builders/promptBuilder.js';
import { validateGeneratedPaper } from '../validators/paperValidator.js';
import type { AssessmentPaper, GeneratePaperInput, ValidationStats } from '../assessment.types.js';

export function getGenAIClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is missing.');
  }
  return new GoogleGenAI({ apiKey });
}

export async function generateDiagnosticPaper(
  requestParams: GeneratePaperInput,
): Promise<{ paper: AssessmentPaper; validationStats: ValidationStats }> {
  const ai = getGenAIClient();
  const { systemInstruction, userPrompt } = buildPrompts(requestParams);

  let attempt = 0;
  let lastErrors: string[] = [];
  let currentPrompt = userPrompt;

  while (attempt < 2) {
    attempt++;

    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL ?? 'gemini-2.5-pro',
      contents: currentPrompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        temperature: 0.3,
      },
    });

    let parsedPaper: AssessmentPaper;
    try {
      const text = response.text ?? '';
      const cleanJson = text.replace(/^```json\s*|\s*```$/g, '').trim();
      parsedPaper = JSON.parse(cleanJson) as AssessmentPaper;
    } catch (parseErr) {
      const message = parseErr instanceof Error ? parseErr.message : String(parseErr);
      lastErrors = [`JSON Parse Error: ${message}`];
      currentPrompt = `${userPrompt}\n\nPREVIOUS ATTEMPT FAILED WITH INVALID JSON: ${lastErrors.join(', ')}. Return strictly valid JSON.`;
      continue;
    }

    const validation = validateGeneratedPaper(parsedPaper, requestParams);
    if (validation.valid) {
      return {
        paper: parsedPaper,
        validationStats: validation.stats ?? {
          computedMarks: 0,
          noveltyRatio: 0,
          mcqCorrectDistribution: {},
        },
      };
    }

    lastErrors = validation.errors;
    currentPrompt = `${userPrompt}\n\nPREVIOUS OUTPUT FAILED VALIDATION:\n- ${lastErrors.join('\n- ')}\nFix these exact issues and return the corrected JSON.`;
  }

  throw new Error(
    `Failed to generate valid question paper after 2 attempts. Errors: ${lastErrors.join('; ')}`,
  );
}
