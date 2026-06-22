import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validateBody, validateQuery, validateParams } from '../middleware/validate.js';
import { authenticate, isCREM } from '../middleware/auth.js';
import * as ctrl from '../controllers/leads.controller.js';
import { createLeadSchema, updateLeadSchema, listLeadsSchema } from '../schemas/lead.schema.js';
import { idParamSchema } from '../schemas/common.schema.js';

const router = Router();
router.use(authenticate, isCREM);

router.get(  '/',    validateQuery(listLeadsSchema), asyncHandler(ctrl.list));
router.get(  '/:id', validateParams(idParamSchema), asyncHandler(ctrl.getById));
router.post( '/',    validateBody(createLeadSchema), asyncHandler(ctrl.create));
router.patch('/:id', validateParams(idParamSchema), validateBody(updateLeadSchema), asyncHandler(ctrl.update));

export default router;
