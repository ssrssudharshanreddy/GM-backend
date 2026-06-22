import { Err } from '../utils/errors.js';

export async function getSalesSummary(db, dateFrom, dateTo) {
  const { data, error } = await db.rpc('get_sales_summary', {
    p_date_from: dateFrom,
    p_date_to:   dateTo,
  });
  if (error) throw Err.fromSupabase(error);
  return data;
}

export async function getRevenueVsTarget(db) {
  const { data, error } = await db.from('v_revenue_vs_target').select('*');
  if (error) throw Err.fromSupabase(error);
  return data;
}

export async function getRiskScores(db, query) {
  let q = db.from('mv_risk_scores').select('*').order('risk_score', { ascending: false });
  if (query.min_risk) q = q.gte('risk_score', query.min_risk);
  const { data, error } = await q;
  if (error) throw Err.fromSupabase(error);
  return data;
}

export async function getOutstandingBalance(db) {
  const { data, error } = await db.from('v_outstanding_balance').select('*').order('total_outstanding', { ascending: false });
  if (error) throw Err.fromSupabase(error);
  return data;
}

export async function getTopCustomers(db, query) {
  const { data, error } = await db
    .from('mv_top_customers')
    .select('*')
    .order('total_revenue', { ascending: false })
    .limit(parseInt(query.limit) || 10);
  if (error) throw Err.fromSupabase(error);
  return data;
}

export async function getCollectionEfficiency(db) {
  const { data, error } = await db.from('mv_collection_efficiency').select('*');
  if (error) throw Err.fromSupabase(error);
  return data;
}

export async function getCremPerformance(db) {
  const { data, error } = await db.from('mv_crem_performance').select('*');
  if (error) throw Err.fromSupabase(error);
  return data;
}

export async function getInventorySummary(db) {
  const { data, error } = await db.from('v_inventory_summary').select('*');
  if (error) throw Err.fromSupabase(error);
  return data;
}

export async function refreshMaterializedViews(db) {
  const { data, error } = await db.rpc('refresh_all_mv');
  if (error) throw Err.fromSupabase(error);
  return { refreshed: true };
}
