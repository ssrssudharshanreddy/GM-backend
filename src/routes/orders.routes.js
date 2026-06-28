import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validateBody, validateQuery, validateParams } from '../middleware/validate.js';
import { authenticate, isCustomer, isInternal, requireRole } from '../middleware/auth.js';
import * as ctrl from '../controllers/orders.controller.js';
import { createOrderSchema, updateOrderStatusSchema, listOrdersSchema, verifyDeliveryPinSchema } from '../schemas/order.schema.js';
import { idParamSchema } from '../schemas/common.schema.js';

const router = Router();
router.use(authenticate);

// All authenticated users may list/view orders (RLS scopes customers to their own, WS to assigned)
router.get( '/',    validateQuery(listOrdersSchema), asyncHandler(ctrl.list));
router.get( '/:id', validateParams(idParamSchema),  asyncHandler(ctrl.getById));

// Only customers place orders
router.post('/',    isCustomer, validateBody(createOrderSchema), asyncHandler(ctrl.create));

// Order status transitions: WE manages allocation/processing; WS handles picking/delivery.
// CREM is view-only on orders per spec — excluded from this route.
router.patch('/:id/status', requireRole('CEO','WE','WS'), validateParams(idParamSchema), validateBody(updateOrderStatusSchema), asyncHandler(ctrl.updateStatus));
router.post('/:id/deliver', requireRole('WS'), validateParams(idParamSchema), validateBody(verifyDeliveryPinSchema), asyncHandler(ctrl.deliver));

export default router;
