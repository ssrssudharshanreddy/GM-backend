import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticate, isCEO } from '../middleware/auth.js';
import * as ctrl from '../controllers/systemSettings.controller.js';
import { z } from 'zod';
import { validateBody } from '../middleware/validate.js';

const bulkSchema = z.object({
  settings: z.array(z.object({ key: z.string().min(1), value: z.string() })).min(1),
});

const router = Router();
router.use(authenticate, isCEO);

router.get( '/',          asyncHandler(ctrl.list));
router.get( '/:key',      asyncHandler(ctrl.getByKey));
router.put( '/:key',      asyncHandler(ctrl.upsert));
router.put( '/',          validateBody(bulkSchema), asyncHandler(ctrl.bulkUpdate));

export default router;
