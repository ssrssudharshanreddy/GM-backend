import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validateBody } from '../middleware/validate.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { pinRateLimiter } from '../middleware/rateLimiter.js';
import * as ctrl from '../controllers/returnPins.controller.js';
import { verifyReturnPinSchema } from '../schemas/return.schema.js';

const router = Router({ mergeParams: true });
router.use(authenticate);

router.post('/',           requireRole('WS','WE','CEO'), asyncHandler(ctrl.generate));
router.get( '/',           requireRole('WS','WE','CEO'), asyncHandler(ctrl.getPin));
router.post('/verify',     pinRateLimiter, requireRole('WS'), validateBody(verifyReturnPinSchema), asyncHandler(ctrl.verify));

export default router;
