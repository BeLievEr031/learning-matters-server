import { Router } from 'express';
import { authController } from './auth.controller.js';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/authenticate.js';
import { createAuthRateLimiter } from '../../middleware/rate-limit.js';
import { registerSchema, loginSchema, refreshSchema, logoutSchema } from './auth.schemas.js';

export const authRouter: Router = Router();

const authLimiter = createAuthRateLimiter();

authRouter.post(
  '/register',
  authLimiter,
  validate({ body: registerSchema }),
  authController.register,
);

authRouter.post('/login', authLimiter, validate({ body: loginSchema }), authController.login);

authRouter.post('/refresh', authLimiter, validate({ body: refreshSchema }), authController.refresh);

authRouter.post('/logout', validate({ body: logoutSchema }), authController.logout);

authRouter.post('/logout-all', authenticate, authController.logoutAll);

// GET /api/v1/auth/me — returns the current authenticated user's profile
authRouter.get('/me', authenticate, authController.me);
