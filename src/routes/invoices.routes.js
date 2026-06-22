import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validateQuery, validateParams } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import * as ctrl from '../controllers/invoices.controller.js';
import { idParamSchema } from '../schemas/common.schema.js';
import { listPaymentsSchema } from '../schemas/payment.schema.js';

const router = Router();
router.use(authenticate);

router.get('/overdue', validateQuery(listPaymentsSchema), asyncHandler(ctrl.listOverdue));
router.get('/',        validateQuery(listPaymentsSchema), asyncHandler(ctrl.list));
router.get('/:id',     validateParams(idParamSchema),    asyncHandler(ctrl.getById));

export default router;
