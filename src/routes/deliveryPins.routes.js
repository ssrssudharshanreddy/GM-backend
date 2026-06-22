import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validateBody, validateParams } from '../middleware/validate.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { pinRateLimiter } from '../middleware/rateLimiter.js';
import * as ctrl from '../controllers/deliveryPins.controller.js';
import { verifyDeliveryPinSchema } from '../schemas/order.schema.js';
import { z } from 'zod';

const orderIdParam = z.object({ orderId: z.string().uuid() });

const router = Router();
router.use(authenticate);

// WS generates & views PIN; CUSTOMER verifies
router.post(  '/orders/:orderId/pin',        requireRole('WS','WE','CEO'), asyncHandler(ctrl.generate));
router.get(   '/orders/:orderId/pin',        requireRole('WS','WE','CEO'), asyncHandler(ctrl.getPin));
router.post(  '/orders/:orderId/verify-pin', pinRateLimiter, requireRole('WS'), validateBody(verifyDeliveryPinSchema), asyncHandler(ctrl.verify));

export default router;
