import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validateBody, validateQuery, validateParams } from '../middleware/validate.js';
import { authenticate, isCREM } from '../middleware/auth.js';
import * as ctrl from '../controllers/followUps.controller.js';
import { createFollowUpSchema } from '../schemas/lead.schema.js';
import { idParamSchema, paginationSchema } from '../schemas/common.schema.js';
import { z } from 'zod';

const listSchema = z.object({
  ...paginationSchema.shape,
  assigned_to:  z.string().uuid().optional(),
  customer_id:  z.string().uuid().optional(),
  is_completed: z.enum(['true', 'false']).optional(),
});

const router = Router();
router.use(authenticate, isCREM);

router.get(  '/',    validateQuery(listSchema),       asyncHandler(ctrl.list));
router.get(  '/:id', validateParams(idParamSchema),  asyncHandler(ctrl.getById));
router.post( '/',    validateBody(createFollowUpSchema), asyncHandler(ctrl.create));
router.patch('/:id/complete', validateParams(idParamSchema), asyncHandler(ctrl.markComplete));
router.patch('/:id', validateParams(idParamSchema), asyncHandler(ctrl.update));

export default router;
