import * as service from '../services/reports.service.js';
import { sendSuccess } from '../utils/response.js';

export async function salesSummary(req, res) {
  sendSuccess(res, await service.salesSummary(req.db, req.query));
}
export async function revenueVsTarget(req, res) {
  sendSuccess(res, await service.revenueVsTarget(req.db));
}
export async function riskScores(req, res) {
  sendSuccess(res, await service.riskScores(req.db, req.query));
}
export async function outstandingBalance(req, res) {
  sendSuccess(res, await service.outstandingBalance(req.db));
}
export async function topCustomers(req, res) {
  sendSuccess(res, await service.topCustomers(req.db, req.query));
}
export async function collectionEfficiency(req, res) {
  sendSuccess(res, await service.collectionEfficiency(req.db));
}
export async function cremPerformance(req, res) {
  sendSuccess(res, await service.cremPerformance(req.db));
}
export async function inventorySummary(req, res) {
  sendSuccess(res, await service.inventorySummary(req.db));
}
export async function refreshMVs(req, res) {
  sendSuccess(res, await service.refreshMVs(req.db));
}
