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
router.post( '/',    isWE, (req, res, next) => {
  // Map gst_percent -> gst_rate for frontend compatibility
  if (req.body.gst_percent !== undefined && req.body.gst_rate === undefined) {
    req.body.gst_rate = req.body.gst_percent;
  }
  // Stash initial_quantity before Zod strips it (not a products column)
  req._initial_quantity = req.body.initial_quantity;
  delete req.body.initial_quantity;
  next();
}, validateBody(createProductSchema), (req, res, next) => {
  // Restore for service layer
  if (req._initial_quantity !== undefined) req.body.initial_quantity = req._initial_quantity;
  next();
}, asyncHandler(ctrl.create));
router.patch('/:id', isWE, validateParams(idParamSchema), (req, res, next) => {
  if (req.body.gst_percent !== undefined && req.body.gst_rate === undefined) {
    req.body.gst_rate = req.body.gst_percent;
  }
  next();
}, validateBody(updateProductSchema), asyncHandler(ctrl.update));

export default router;
