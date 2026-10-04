import { Router } from 'express';
import { usersController } from './users.controller.js';
import { validate } from '../../middleware/validate.js';
import {
  createUserSchema,
  updateUserSchema,
  listUsersQuerySchema,
  userIdParamSchema,
} from './users.schemas.js';

export const usersRouter: Router = Router();

usersRouter.post('/', validate({ body: createUserSchema }), usersController.createUser);

usersRouter.get('/', validate({ query: listUsersQuerySchema }), usersController.listUsers);

usersRouter.get('/:id', validate({ params: userIdParamSchema }), usersController.getUserById);

usersRouter.patch(
  '/:id',
  validate({ params: userIdParamSchema, body: updateUserSchema }),
  usersController.updateUser,
);

usersRouter.delete('/:id', validate({ params: userIdParamSchema }), usersController.deleteUser);
