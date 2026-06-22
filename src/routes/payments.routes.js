import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validateBody, validateQuery, validateParams } from '../middleware/validate.js';
import { authenticate, isCustomer, isAE, requireRole } from '../middleware/auth.js';
import { uploadSingle } from '../middleware/upload.js';
import * as ctrl from '../controllers/payments.controller.js';
import { submitPaymentSchema, verifyPaymentSchema, dishonoredPaymentSchema, listPaymentsSchema } from '../schemas/payment.schema.js';
import { idParamSchema } from '../schemas/common.schema.js';

const router = Router();
router.use(authenticate);

router.get(  '/',    validateQuery(listPaymentsSchema), asyncHandler(ctrl.list));
router.get(  '/:id', validateParams(idParamSchema),    asyncHandler(ctrl.getById));

// Customers submit payments; AE verifies or marks dishonored
router.post( '/',    isCustomer, validateBody(submitPaymentSchema), asyncHandler(ctrl.submit));
router.patch('/:id/verify',      isAE, validateParams(idParamSchema), validateBody(verifyPaymentSchema), asyncHandler(ctrl.verify));
router.patch('/:id/dishonored',  isAE, validateParams(idParamSchema), validateBody(dishonoredPaymentSchema), asyncHandler(ctrl.markDishonored));

// Only the owning customer or AE/CEO may attach a receipt to a payment
router.post( '/:id/receipt', requireRole('CUSTOMER','AE','CEO'), validateParams(idParamSchema), uploadSingle, asyncHandler(ctrl.uploadReceipt));

export default router;
