import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validateBody, validateQuery, validateParams } from '../middleware/validate.js';
import { authenticate, isAE } from '../middleware/auth.js';
import * as ctrl from '../controllers/debitNotes.controller.js';
import { createDebitNoteSchema } from '../schemas/credit.schema.js';
import { idParamSchema, paginationSchema } from '../schemas/common.schema.js';

const router = Router();
router.use(authenticate, isAE);

router.get( '/',    validateQuery(paginationSchema), asyncHandler(ctrl.list));
router.get( '/:id', validateParams(idParamSchema),  asyncHandler(ctrl.getById));
router.post('/',    validateBody(createDebitNoteSchema), asyncHandler(ctrl.create));

export default router;
