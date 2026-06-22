import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validateBody, validateQuery, validateParams } from '../middleware/validate.js';
import { authenticate, isAE, isCREM, requireRole } from '../middleware/auth.js';
import * as ctrl from '../controllers/collectionTasks.controller.js';
import { idParamSchema, paginationSchema } from '../schemas/common.schema.js';
import { z } from 'zod';

const createSchema = z.object({
  customer_id: z.string().uuid(),
  invoice_id:  z.string().uuid().optional().nullable(),
  assigned_to: z.string().uuid(),
  due_date:    z.string().date(),
  notes:       z.string().max(500).optional().nullable(),
  amount_to_collect: z.number().nonnegative(),
});

const updateStatusSchema = z.object({
  status:        z.enum(['OPEN', 'IN_PROGRESS', 'COMPLETED', 'ESCALATED', 'CANCELLED']),
  outcome_notes: z.string().max(500).optional().nullable(),
});

const listSchema = z.object({
  ...paginationSchema.shape,
  assigned_to: z.string().uuid().optional(),
  customer_id: z.string().uuid().optional(),
  status:      z.string().optional(),
});

const router = Router();
router.use(authenticate);

// CREM can view collection tasks assigned to them; AE/CEO can view all
// RLS on the table enforces that CREM only sees rows where assigned_to = their id
router.get(  '/',    isCREM, validateQuery(listSchema), asyncHandler(ctrl.list));
router.get(  '/:id', isCREM, validateParams(idParamSchema), asyncHandler(ctrl.getById));

// Only AE (and CEO) may create and update collection tasks
router.post( '/',    isAE, validateBody(createSchema), asyncHandler(ctrl.create));
router.patch('/:id/status', requireRole('CEO','AE','CREM'), validateParams(idParamSchema), validateBody(updateStatusSchema), asyncHandler(ctrl.updateStatus));

export default router;
