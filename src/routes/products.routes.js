import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validateBody, validateQuery, validateParams } from '../middleware/validate.js';
import { authenticate, isWE } from '../middleware/auth.js';
import { uploadMultiple } from '../middleware/upload.js';
import * as ctrl from '../controllers/products.controller.js';
import { createProductSchema, updateProductSchema, listProductsSchema } from '../schemas/product.schema.js';
import { idParamSchema } from '../schemas/common.schema.js';

const router = Router();
router.use(authenticate);

router.get(  '/',    validateQuery(listProductsSchema), asyncHandler(ctrl.list));
router.get(  '/:id', validateParams(idParamSchema),    asyncHandler(ctrl.getById));

const mapFormData = (req, res, next) => {
  // Map gst_percent -> gst_rate for frontend compatibility
  if (req.body.gst_percent !== undefined && req.body.gst_rate === undefined) {
    req.body.gst_rate = req.body.gst_percent;
  }
  
  // Stash fields not in products table before Zod strips them
  req._initial_quantity  = req.body.initial_quantity;
  req._reorder_threshold = req.body.reorder_threshold;
  req._deleted_images    = req.body.deleted_images;

  delete req.body.initial_quantity;
  delete req.body.reorder_threshold;
  delete req.body.deleted_images;
  
  // Convert deleted_images to array if stringified
  if (typeof req._deleted_images === 'string') {
    try { req._deleted_images = JSON.parse(req._deleted_images); } catch(e) { req._deleted_images = []; }
  }

  next();
};

const restoreFormData = (req, res, next) => {
  // Restore for service layer
  if (req._initial_quantity  !== undefined) req.body.initial_quantity  = req._initial_quantity;
  if (req._reorder_threshold !== undefined) req.body.reorder_threshold = req._reorder_threshold;
  if (req._deleted_images !== undefined)    req.body.deleted_images    = req._deleted_images;
  next();
};

router.post( '/',    
  isWE, 
  uploadMultiple,
  (req, _res, next) => {
    console.log('[DEBUG POST /products] files:', req.files?.length, '| body keys:', Object.keys(req.body || {}));
    next();
  },
  mapFormData,
  validateBody(createProductSchema), 
  restoreFormData,
  asyncHandler(ctrl.create)
);

router.patch('/:id', 
  isWE, 
  validateParams(idParamSchema), 
  uploadMultiple,
  (req, _res, next) => {
    console.log('[DEBUG PATCH /products/:id] files:', req.files?.length, '| body keys:', Object.keys(req.body || {}));
    next();
  },
  mapFormData,
  validateBody(updateProductSchema), 
  restoreFormData,
  asyncHandler(ctrl.update)
);

export default router;
