import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validateQuery, validateParams } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import * as ctrl from '../controllers/notifications.controller.js';
import { idParamSchema, paginationSchema } from '../schemas/common.schema.js';
import { z } from 'zod';

const listSchema = z.object({
  ...paginationSchema.shape,
  is_read: z.enum(['true', 'false']).optional(),
});

const router = Router();
router.use(authenticate);

router.get( '/',               validateQuery(listSchema), asyncHandler(ctrl.list));
router.get( '/unread-count',   asyncHandler(ctrl.unreadCount));
router.post('/mark-all-read',  asyncHandler(ctrl.markAllRead));
router.patch('/:id/read',      validateParams(idParamSchema), asyncHandler(ctrl.markRead));
router.get( '/preferences',    asyncHandler(ctrl.getPreferences));
router.put( '/preferences',    asyncHandler(ctrl.updatePreferences));

export default router;
