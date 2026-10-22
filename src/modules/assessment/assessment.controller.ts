import type { Request, Response, NextFunction } from 'express';
import { generateDiagnosticPaper } from './services/generator.service.js';
import { evaluateStudentSubmission } from './services/analytics.service.js';
import type { AssessmentPaper, GeneratePaperInput, StudentSubmission } from './assessment.types.js';

export class AssessmentController {
  generatePaper = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await generateDiagnosticPaper(req.body as GeneratePaperInput);
      res.status(200).json({
        success: true,
        data: result.paper,
        validationStats: result.validationStats,
      });
    } catch (error) {
      next(error);
    }
  };

  evaluateSubmission = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const { paper, studentSubmission } = req.body as {
        paper: AssessmentPaper;
        studentSubmission: StudentSubmission;
      };
      const report = evaluateStudentSubmission(paper, studentSubmission);
      res.status(200).json({
        success: true,
        report,
      });
    } catch (error) {
      next(error);
    }
  };
}

export const assessmentController = new AssessmentController();

export async function handleGeneratePaper(req: Request, res: Response): Promise<void> {
  try {
    const result = await generateDiagnosticPaper(req.body as GeneratePaperInput);
    res.status(200).json({
      success: true,
      data: result.paper,
      validationStats: result.validationStats,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate paper';
    res.status(400).json({
      success: false,
      message,
    });
  }
}

export function handleEvaluateSubmission(req: Request, res: Response): void {
  try {
    const { paper, studentSubmission } = req.body as {
      paper: AssessmentPaper;
      studentSubmission: StudentSubmission;
    };
    const report = evaluateStudentSubmission(paper, studentSubmission);
    res.status(200).json({
      success: true,
      report,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to evaluate submission';
    res.status(400).json({
      success: false,
      message,
    });
  }
}
