import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { uploadSingle } from '../middleware/upload.js';
import * as ctrl from '../controllers/returnProofs.controller.js';

const router = Router({ mergeParams: true });
router.use(authenticate);

router.get( '/', asyncHandler(ctrl.getProofs));
router.post('/', requireRole('WS','WE','CEO'), uploadSingle, asyncHandler(ctrl.upload));

export default router;
