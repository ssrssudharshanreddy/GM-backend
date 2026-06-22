import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validateBody, validateQuery, validateParams } from '../middleware/validate.js';
import { authenticate, isWE } from '../middleware/auth.js';
import * as ctrl from '../controllers/products.controller.js';
import { createProductSchema, updateProductSchema, listProductsSchema } from '../schemas/product.schema.js';
import { idParamSchema } from '../schemas/common.schema.js';

const router = Router();
router.use(authenticate);

router.get(  '/',    validateQuery(listProductsSchema), asyncHandler(ctrl.list));
router.get(  '/:id', validateParams(idParamSchema),    asyncHandler(ctrl.getById));
router.post( '/',    isWE, validateBody(createProductSchema), asyncHandler(ctrl.create));
router.patch('/:id', isWE, validateParams(idParamSchema), validateBody(updateProductSchema), asyncHandler(ctrl.update));

export default router;
