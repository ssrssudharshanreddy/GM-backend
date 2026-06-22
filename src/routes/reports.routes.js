import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validateQuery } from '../middleware/validate.js';
import { authenticate, isCEO, isAE, requireRole } from '../middleware/auth.js';
import * as ctrl from '../controllers/reports.controller.js';
import { z } from 'zod';

const dateRangeQuery = z.object({
  dateFrom: z.string().optional(),
  dateTo:   z.string().optional(),
  limit:    z.coerce.number().int().min(1).max(50).default(10),
  min_risk: z.coerce.number().min(0).max(100).optional(),
});

const router = Router();
router.use(authenticate);

// ─── Financial reports — CEO and AE only ──────────────────────────────────────
// WE and WS have no access to revenue, outstanding, risk, or collection data
router.get('/sales-summary',        requireRole('CEO','AE','CRE'), validateQuery(dateRangeQuery), asyncHandler(ctrl.salesSummary));
router.get('/revenue-vs-target',    requireRole('CEO','AE','CRE'), asyncHandler(ctrl.revenueVsTarget));
router.get('/risk-scores',          requireRole('CEO','AE'),       validateQuery(dateRangeQuery), asyncHandler(ctrl.riskScores));
router.get('/outstanding-balance',  requireRole('CEO','AE'),       asyncHandler(ctrl.outstandingBalance));
router.get('/top-customers',        requireRole('CEO','AE','CRE'), validateQuery(dateRangeQuery), asyncHandler(ctrl.topCustomers));
router.get('/collection-efficiency',requireRole('CEO','AE'),       asyncHandler(ctrl.collectionEfficiency));

// ─── Team / operational reports — CEO and CRE ─────────────────────────────────
router.get('/crem-performance',     requireRole('CEO','CRE'),      asyncHandler(ctrl.cremPerformance));

// ─── Warehouse report — CEO and WE only ───────────────────────────────────────
router.get('/inventory-summary',    requireRole('CEO','WE'),       asyncHandler(ctrl.inventorySummary));

// ─── Admin: manual materialized-view refresh — CEO only ───────────────────────
router.post('/refresh-mvs',         isCEO, asyncHandler(ctrl.refreshMVs));

export default router;
