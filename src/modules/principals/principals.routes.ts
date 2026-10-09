import { Router } from 'express';
import { principalsController } from './principals.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize, requireSchoolScope } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { upsertPrincipalSchema, schoolIdParamSchema } from './principals.schemas.js';

/**
 * Sub-resource router mounted at /api/v1/schools/:schoolId/principal
 */
export const schoolPrincipalRouter: Router = Router({ mergeParams: true });

// Get principal profile for a school
schoolPrincipalRouter.get(
  '/',
  authenticate,
  authorize('super_admin', 'admin', 'principal'),
  requireSchoolScope(),
  validate({ params: schoolIdParamSchema }),
  principalsController.getPrincipal,
);

// Set or update principal profile for a school
schoolPrincipalRouter.put(
  '/',
  authenticate,
  authorize('super_admin', 'admin'),
  requireSchoolScope(),
  validate({ params: schoolIdParamSchema, body: upsertPrincipalSchema }),
  principalsController.upsertPrincipal,
);
