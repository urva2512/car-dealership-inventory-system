import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/authenticate.js';
import { validateBody } from '../../middleware/validateRequest.js';
import { createAdmin, login, register } from './auth.controller.js';
import { loginSchema, registerSchema } from './auth.validation.js';

export const authRouter = Router();

authRouter.post('/register', validateBody(registerSchema), register);
authRouter.post('/login', validateBody(loginSchema), login);
authRouter.post('/admin', authenticate, requireRole('admin'), validateBody(registerSchema), createAdmin);
