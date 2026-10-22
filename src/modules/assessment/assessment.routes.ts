import { Router } from 'express';
import { assessmentController } from './assessment.controller.js';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/authenticate.js';
import { generatePaperSchema, evaluateSubmissionSchema } from './assessment.schemas.js';

export const assessmentRouter: Router = Router();

assessmentRouter.post(
  '/generate',
  authenticate,
  validate({ body: generatePaperSchema }),
  assessmentController.generatePaper,
);

assessmentRouter.post(
  '/evaluate',
  authenticate,
  validate({ body: evaluateSubmissionSchema }),
  assessmentController.evaluateSubmission,
);
