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

// ─── CEO Custom Reports and Dashboards ────────────────────────────────────────
router.get('/ceo/dashboard',           isCEO, asyncHandler(ctrl.getCEODashboard));
router.get('/ceo/financials',          isCEO, asyncHandler(ctrl.getCEOFinancials));
router.get('/ceo/warehouse',           isCEO, asyncHandler(ctrl.getCEOWarehouse));
router.get('/ceo/:reportType',         isCEO, asyncHandler(ctrl.getCEOReport));
router.get('/ceo/:reportType/export',  isCEO, asyncHandler(ctrl.exportCEOReport));
router.get('/alerts',                  isCEO, asyncHandler(ctrl.getAlerts));
router.get('/audit-logs',              isCEO, asyncHandler(ctrl.getAuditLogs));

// ─── WS / WE / CREM / CRE / AE Specific Dashboards and Summaries ──────────────
router.get('/ws/dashboard',           requireRole('WS'), asyncHandler(ctrl.getWSDashboard));
router.get('/we/dashboard',           requireRole('WE'), asyncHandler(ctrl.getWEDashboard));
router.get('/we/summary',             requireRole('WE'), asyncHandler(ctrl.getWESummary));
router.get('/crem/dashboard',         requireRole('CREM'), asyncHandler(ctrl.getCREMDashboard));
router.get('/crem/summary',           requireRole('CREM'), asyncHandler(ctrl.getCREMSummary));
router.get('/cre/dashboard',          requireRole('CRE'), asyncHandler(ctrl.getCREDashboard));
router.get('/cre/summary',            requireRole('CRE'), asyncHandler(ctrl.getCRESummary));
router.get('/ae/dashboard',           requireRole('AE'), asyncHandler(ctrl.getAEDashboard));
router.get('/ae/outstanding',         requireRole('AE'), asyncHandler(ctrl.getAEOutstanding));
router.get('/ae/summary',             requireRole('AE'), asyncHandler(ctrl.getAESummary));

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
