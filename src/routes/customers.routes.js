import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validateBody, validateQuery, validateParams } from '../middleware/validate.js';
import { authenticate, isCEO, isCRE, isInternal, requireRole } from '../middleware/auth.js';
import { uploadSingle } from '../middleware/upload.js';
import * as customersController from '../controllers/customers.controller.js';
import {
  listCustomersSchema, updateCustomerSchema, createApplicationSchema,
  reviewApplicationSchema, assignCremSchema,
} from '../schemas/customer.schema.js';
import { idParamSchema } from '../schemas/common.schema.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// ─── Public: customer self-registration ──────────────────────────────────────
router.post('/register', authRateLimiter, validateBody(createApplicationSchema), asyncHandler(customersController.selfRegister));

// ─── Protected routes ─────────────────────────────────────────────────────────
router.use(authenticate);

// All internal roles may list/view customers (RLS scopes CREM to assigned only)
router.get(  '/',    isInternal, validateQuery(listCustomersSchema), asyncHandler(customersController.list));
router.get(  '/:id', isInternal, validateParams(idParamSchema),     asyncHandler(customersController.getById));

// Only CEO, CRE, and AE may mutate customer profile data
router.patch('/:id', requireRole('CEO','CRE','AE'), validateParams(idParamSchema), validateBody(updateCustomerSchema), asyncHandler(customersController.update));

// Only CRE (and CEO) assigns a CREM to a customer
router.post( '/:id/assign-crem', isCRE, validateParams(idParamSchema), validateBody(assignCremSchema), asyncHandler(customersController.assignCrem));

// Block/unblock a customer — CEO only (spec: "Only CEO can block/unblock customer")
router.patch('/:id/status', isCEO, validateParams(idParamSchema), asyncHandler(customersController.updateStatus));

// Documents — internal roles can view; CEO/CRE/AE/CREM can upload on behalf of customer
router.get( '/:id/documents', isInternal, validateParams(idParamSchema), asyncHandler(customersController.getDocuments));
router.post('/:id/documents', requireRole('CEO','CRE','AE','CREM'), validateParams(idParamSchema), uploadSingle, asyncHandler(customersController.uploadDocument));

export default router;
