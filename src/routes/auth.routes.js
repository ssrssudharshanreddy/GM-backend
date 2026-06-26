import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validateBody } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';
import * as authController from '../controllers/auth.controller.js';
import { loginSchema, refreshSchema, changePasswordSchema, forgotPasswordSchema } from '../schemas/auth.schema.js';

const router = Router();

router.post('/login',           authRateLimiter, validateBody(loginSchema),           asyncHandler(authController.login));
router.post('/refresh',         authRateLimiter, validateBody(refreshSchema),          asyncHandler(authController.refreshToken));
router.post('/logout',          authenticate,                                           asyncHandler(authController.logout));
router.get( '/me',              authenticate,                                           asyncHandler(authController.getMyProfile));
router.put( '/me/password',     authenticate, validateBody(changePasswordSchema),     asyncHandler(authController.changePassword));
router.post('/forgot-password', authRateLimiter, validateBody(forgotPasswordSchema),  asyncHandler(authController.forgotPassword));

export default router;
