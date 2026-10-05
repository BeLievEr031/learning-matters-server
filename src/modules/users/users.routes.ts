import { Router } from 'express';
import { usersController } from './users.controller.js';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import {
  createUserSchema,
  updateUserSchema,
  listUsersQuerySchema,
  userIdParamSchema,
} from './users.schemas.js';

export const usersRouter: Router = Router();

// Authenticated user profile routes (must precede /:id)
usersRouter.get('/me', authenticate, usersController.getCurrentUser);
usersRouter.patch(
  '/me',
  authenticate,
  validate({ body: updateUserSchema }),
  usersController.updateCurrentUser,
);

// Admin-only user listing
usersRouter.get(
  '/',
  authenticate,
  authorize('super_admin', 'admin'),
  validate({ query: listUsersQuerySchema }),
  usersController.listUsers,
);

// Create user
usersRouter.post('/', validate({ body: createUserSchema }), usersController.createUser);

// Specific user operations
usersRouter.get(
  '/:id',
  authenticate,
  validate({ params: userIdParamSchema }),
  usersController.getUserById,
);

usersRouter.patch(
  '/:id',
  authenticate,
  validate({ params: userIdParamSchema, body: updateUserSchema }),
  usersController.updateUser,
);

// Admin-only delete
usersRouter.delete(
  '/:id',
  authenticate,
  authorize('super_admin', 'admin'),
  validate({ params: userIdParamSchema }),
  usersController.deleteUser,
);
