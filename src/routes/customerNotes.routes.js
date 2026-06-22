import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validateBody, validateQuery, validateParams } from '../middleware/validate.js';
import { authenticate, isCREM } from '../middleware/auth.js';
import * as ctrl from '../controllers/customerNotes.controller.js';
import { idParamSchema, paginationSchema } from '../schemas/common.schema.js';
import { z } from 'zod';

const noteSchema = z.object({
  content:      z.string().min(1).max(2000),
  is_sensitive: z.boolean().default(false),
});

const router = Router({ mergeParams: true });
router.use(authenticate, isCREM);

router.get( '/',    validateQuery(paginationSchema), asyncHandler(ctrl.list));
router.post('/',    validateBody(noteSchema), asyncHandler(ctrl.create));
router.delete('/:id', validateParams(idParamSchema), asyncHandler(ctrl.remove));

export default router;
