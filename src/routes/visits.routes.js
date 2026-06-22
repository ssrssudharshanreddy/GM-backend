import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validateBody, validateQuery, validateParams } from '../middleware/validate.js';
import { authenticate, isCREM } from '../middleware/auth.js';
import * as ctrl from '../controllers/visits.controller.js';
import { createVisitSchema, completeVisitSchema } from '../schemas/lead.schema.js';
import { idParamSchema, paginationSchema } from '../schemas/common.schema.js';
import { z } from 'zod';

const listSchema = z.object({
  ...paginationSchema.shape,
  crem_id: z.string().uuid().optional(),
  customer_id: z.string().uuid().optional(),
  status: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

const router = Router();
router.use(authenticate, isCREM);

router.get(  '/',    validateQuery(listSchema),         asyncHandler(ctrl.list));
router.get(  '/:id', validateParams(idParamSchema),     asyncHandler(ctrl.getById));
router.post( '/',    validateBody(createVisitSchema),   asyncHandler(ctrl.schedule));
router.patch('/:id/complete', validateParams(idParamSchema), validateBody(completeVisitSchema), asyncHandler(ctrl.complete));

export default router;
