import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validateBody, validateQuery, validateParams } from '../middleware/validate.js';
import { authenticate, isAE, isCREM, requireRole } from '../middleware/auth.js';
import * as ctrl from '../controllers/creditAccounts.controller.js';
import { createCreditAccountSchema, updateCreditLimitSchema, freezeCreditSchema } from '../schemas/credit.schema.js';
import { idParamSchema, paginationSchema } from '../schemas/common.schema.js';
import { z } from 'zod';

const customerParam = z.object({ customerId: z.string().uuid() });

const router = Router();
router.use(authenticate);

// ─── Read access: AE/CEO manage; CREM and CRE view (spec: "credit info read-only") ──
router.get('/',                             isAE, validateQuery(paginationSchema), asyncHandler(ctrl.list));

router.get('/my',                             requireRole('CUSTOMER'), asyncHandler(ctrl.getMyCreditAccount));
router.get('/my/history',                     requireRole('CUSTOMER'), validateQuery(paginationSchema), asyncHandler(ctrl.getMyCreditHistory));

// CREM may read credit info for assigned customers (RLS enforces assignment scope)
router.get('/customer/:customerId',         requireRole('CEO','AE','CRE','CREM'), validateParams(customerParam), asyncHandler(ctrl.getByCustomer));
router.get('/customer/:customerId/history', requireRole('CEO','AE','CRE','CREM'), validateParams(customerParam), validateQuery(paginationSchema), asyncHandler(ctrl.getHistory));

// ─── Write access: AE and CEO only ────────────────────────────────────────────
router.post('/',                             isAE, validateBody(createCreditAccountSchema), asyncHandler(ctrl.create));
router.patch('/customer/:customerId/limit',  isAE, validateParams(customerParam), validateBody(updateCreditLimitSchema), asyncHandler(ctrl.updateLimit));
router.post( '/customer/:customerId/freeze', isAE, validateParams(customerParam), validateBody(freezeCreditSchema), asyncHandler(ctrl.freeze));
router.post( '/customer/:customerId/unfreeze', isAE, validateParams(customerParam), asyncHandler(ctrl.unfreeze));

export default router;
