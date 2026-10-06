import { Router } from 'express';
import { schoolsController } from './schools.controller.js';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize, requireSchoolScope } from '../../middleware/authorize.js';
import {
  createSchoolSchema,
  updateSchoolSchema,
  listSchoolsQuerySchema,
  schoolIdParamSchema,
} from './schools.schemas.js';

export const schoolsRouter: Router = Router();

// Create school (super_admin only)
schoolsRouter.post(
  '/',
  authenticate,
  authorize('super_admin'),
  validate({ body: createSchoolSchema }),
  schoolsController.createSchool,
);

// List schools (super_admin only, paginated + filterable)
schoolsRouter.get(
  '/',
  authenticate,
  authorize('super_admin'),
  validate({ query: listSchoolsQuerySchema }),
  schoolsController.listSchools,
);

// Get school by ID (super_admin OR own-school admin / principal)
schoolsRouter.get(
  '/:schoolId',
  authenticate,
  authorize('super_admin', 'admin', 'principal'),
  requireSchoolScope(),
  validate({ params: schoolIdParamSchema }),
  schoolsController.getSchoolById,
);

// Update school (super_admin only)
schoolsRouter.patch(
  '/:schoolId',
  authenticate,
  authorize('super_admin'),
  validate({ params: schoolIdParamSchema, body: updateSchoolSchema }),
  schoolsController.updateSchool,
);

// Delete school (super_admin only, soft delete)
schoolsRouter.delete(
  '/:schoolId',
  authenticate,
  authorize('super_admin'),
  validate({ params: schoolIdParamSchema }),
  schoolsController.deleteSchool,
);
