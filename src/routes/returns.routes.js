import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validateBody, validateQuery, validateParams } from '../middleware/validate.js';
import { authenticate, isCustomer, requireRole } from '../middleware/auth.js';
import * as ctrl from '../controllers/returns.controller.js';
import { createReturnSchema, updateReturnStatusSchema, updateReturnItemOutcomeSchema, listReturnsSchema } from '../schemas/return.schema.js';
import { idParamSchema } from '../schemas/common.schema.js';

const router = Router();
router.use(authenticate);

router.get( '/',    validateQuery(listReturnsSchema), asyncHandler(ctrl.list));
router.get( '/:id', validateParams(idParamSchema),  asyncHandler(ctrl.getById));
router.post('/',    isCustomer, validateBody(createReturnSchema), asyncHandler(ctrl.create));
router.patch('/:id/status',       requireRole('CEO','CREM','WE','WS'), validateParams(idParamSchema), validateBody(updateReturnStatusSchema), asyncHandler(ctrl.updateStatus));
router.patch('/:id/item-outcomes', requireRole('CEO','WE'),            validateParams(idParamSchema), validateBody(updateReturnItemOutcomeSchema), asyncHandler(ctrl.updateItemOutcomes));

export default router;
