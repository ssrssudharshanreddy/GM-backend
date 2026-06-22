import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validateBody, validateQuery, validateParams } from '../middleware/validate.js';
import { authenticate, isInternal, isWE } from '../middleware/auth.js';
import * as ctrl from '../controllers/categories.controller.js';
import { createCategorySchema, updateCategorySchema, listProductsSchema } from '../schemas/product.schema.js';
import { idParamSchema, paginationSchema } from '../schemas/common.schema.js';

const router = Router();
router.use(authenticate);

router.get(  '/',    asyncHandler(ctrl.list));
router.get(  '/:id', validateParams(idParamSchema), asyncHandler(ctrl.getById));
router.post( '/',    isWE, validateBody(createCategorySchema), asyncHandler(ctrl.create));
router.patch('/:id', isWE, validateParams(idParamSchema), validateBody(updateCategorySchema), asyncHandler(ctrl.update));

export default router;
