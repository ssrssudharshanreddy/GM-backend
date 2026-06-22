import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validateBody, validateQuery, validateParams } from '../middleware/validate.js';
import { authenticate, isAE } from '../middleware/auth.js';
import * as ctrl from '../controllers/paymentCommitments.controller.js';
import { createCommitmentSchema, listPaymentsSchema } from '../schemas/payment.schema.js';
import { idParamSchema } from '../schemas/common.schema.js';
import { z } from 'zod';

const updateStatusSchema = z.object({ status: z.enum(['PENDING', 'FULFILLED', 'BROKEN', 'RESCHEDULED']) });

const router = Router();
router.use(authenticate, isAE);

router.get(  '/',    validateQuery(listPaymentsSchema), asyncHandler(ctrl.list));
router.get(  '/:id', validateParams(idParamSchema),    asyncHandler(ctrl.getById));
router.post( '/',    validateBody(createCommitmentSchema), asyncHandler(ctrl.create));
router.patch('/:id/status', validateParams(idParamSchema), validateBody(updateStatusSchema), asyncHandler(ctrl.updateStatus));

export default router;
