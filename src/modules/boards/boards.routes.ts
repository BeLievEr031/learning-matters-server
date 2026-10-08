import { Router } from 'express';
import { boardsController } from './boards.controller.js';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize, requireSchoolScope } from '../../middleware/authorize.js';
import {
  createBoardSchema,
  updateBoardSchema,
  listBoardsQuerySchema,
  boardIdParamSchema,
  schoolIdParamSchema,
} from './boards.schemas.js';

/**
 * Router mounted at /api/v1/schools/:schoolId/boards
 */
export const schoolBoardsRouter: Router = Router({ mergeParams: true });

// Create board under school (super_admin or admin of own school)
schoolBoardsRouter.post(
  '/',
  authenticate,
  authorize('super_admin', 'admin'),
  requireSchoolScope(),
  validate({ params: schoolIdParamSchema, body: createBoardSchema }),
  boardsController.createBoard,
);

// List boards under school (super_admin, admin, or principal of own school)
schoolBoardsRouter.get(
  '/',
  authenticate,
  authorize('super_admin', 'admin', 'principal'),
  requireSchoolScope(),
  validate({ params: schoolIdParamSchema, query: listBoardsQuerySchema }),
  boardsController.listBoards,
);

import { boardGradesRouter } from '../grades/grades.routes.js';

/**
 * Router mounted at /api/v1/boards
 */
export const boardsRouter: Router = Router();

// Sub-resource routers
boardsRouter.use('/:boardId/grades', boardGradesRouter);

// Get board by ID (super_admin or scoped admin/principal)
boardsRouter.get(
  '/:boardId',
  authenticate,
  authorize('super_admin', 'admin', 'principal'),
  validate({ params: boardIdParamSchema }),
  boardsController.getBoardById,
);

// Update board (super_admin or admin of own school)
boardsRouter.patch(
  '/:boardId',
  authenticate,
  authorize('super_admin', 'admin'),
  validate({ params: boardIdParamSchema, body: updateBoardSchema }),
  boardsController.updateBoard,
);

// Delete board (super_admin or admin of own school, soft-delete)
boardsRouter.delete(
  '/:boardId',
  authenticate,
  authorize('super_admin', 'admin'),
  validate({ params: boardIdParamSchema }),
  boardsController.deleteBoard,
);
