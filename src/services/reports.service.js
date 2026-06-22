import * as repo from '../repositories/reports.repository.js';
import { Err } from '../utils/errors.js';

export async function salesSummary(db, query) {
  if (!query.dateFrom || !query.dateTo) throw Err.badRequest('dateFrom and dateTo are required');
  return repo.getSalesSummary(db, query.dateFrom, query.dateTo);
}

export async function revenueVsTarget(db) {
  return repo.getRevenueVsTarget(db);
}

export async function riskScores(db, query) {
  return repo.getRiskScores(db, query);
}

export async function outstandingBalance(db) {
  return repo.getOutstandingBalance(db);
}

export async function topCustomers(db, query) {
  return repo.getTopCustomers(db, query);
}

export async function collectionEfficiency(db) {
  return repo.getCollectionEfficiency(db);
}

export async function cremPerformance(db) {
  return repo.getCremPerformance(db);
}

export async function inventorySummary(db) {
  return repo.getInventorySummary(db);
}

export async function refreshMVs(db) {
  return repo.refreshMaterializedViews(db);
}
