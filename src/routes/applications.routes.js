import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validateBody, validateQuery, validateParams } from '../middleware/validate.js';
import { authenticate, isCRE, isInternal } from '../middleware/auth.js';
import * as customersController from '../controllers/customers.controller.js';
import { reviewApplicationSchema } from '../schemas/customer.schema.js';
import { idParamSchema, paginationSchema } from '../schemas/common.schema.js';
import { z } from 'zod';

const listSchema = z.object({
  page:   paginationSchema.shape.page,
  limit:  paginationSchema.shape.limit,
  status: z.string().optional(),
});

const router = Router();
router.use(authenticate);

router.get( '/',    isInternal, validateQuery(listSchema),   asyncHandler(customersController.listApplications));
router.get( '/:id', isInternal, validateParams(idParamSchema), asyncHandler(customersController.getApplication));
router.patch('/:id/review', isCRE, validateParams(idParamSchema), validateBody(reviewApplicationSchema), asyncHandler(customersController.reviewApplication));

export default router;
