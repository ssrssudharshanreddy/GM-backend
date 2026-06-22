import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validateBody, validateQuery, validateParams } from '../middleware/validate.js';
import { authenticate, isWE, isInternal } from '../middleware/auth.js';
import * as ctrl from '../controllers/inventory.controller.js';
import { adjustInventorySchema, updateThresholdSchema, listMovementsSchema } from '../schemas/inventory.schema.js';
import { idParamSchema } from '../schemas/common.schema.js';
import { z } from 'zod';

const router = Router();
router.use(authenticate, isInternal);

router.get( '/',                 validateQuery(listMovementsSchema), asyncHandler(ctrl.list));
router.get( '/low-stock',        asyncHandler(ctrl.getLowStock));
router.get( '/movements',        validateQuery(listMovementsSchema), asyncHandler(ctrl.listMovements));
router.get( '/product/:productId', asyncHandler(ctrl.getByProduct));
router.post('/adjust',           isWE, validateBody(adjustInventorySchema), asyncHandler(ctrl.adjust));
router.patch('/product/:productId/threshold', isWE, validateBody(updateThresholdSchema), asyncHandler(ctrl.updateThreshold));

export default router;
