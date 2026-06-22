import { Err } from '../utils/errors.js';
import { getPagination } from '../utils/pagination.js';

export async function findAll(db, query) {
  const { from, to } = getPagination(query);
  let q = db
    .from('inventory')
    .select('*, products(name, product_code, unit)', { count: 'exact' })
    .range(from, to)
    .order('created_at', { ascending: false });
  if (query.product_id) q = q.eq('product_id', query.product_id);
  const { data, error, count } = await q;
  if (error) throw Err.fromSupabase(error);
  return { data, count };
}

export async function findByProduct(db, productId) {
  const { data, error } = await db.from('inventory').select('*').eq('product_id', productId).maybeSingle();
  if (error) throw Err.fromSupabase(error);
  return data;
}

export async function findMovements(db, query) {
  const { from, to } = getPagination(query);
  let q = db
    .from('inventory_movements')
    .select('*, products(name, product_code), employee_profiles!performed_by(full_name)', { count: 'exact' })
    .range(from, to)
    .order('created_at', { ascending: false });
  if (query.product_id) q = q.eq('product_id', query.product_id);
  if (query.dateFrom)   q = q.gte('created_at', query.dateFrom);
  if (query.dateTo)     q = q.lte('created_at', query.dateTo);
  const { data, error, count } = await q;
  if (error) throw Err.fromSupabase(error);
  return { data, count };
}

export async function upsert(db, productId, quantityChange, payload, performedBy) {
  // Use the DB function for atomic inventory adjustment
  const { data, error } = await db.rpc('adjust_inventory', {
    p_product_id:      productId,
    p_quantity_change: quantityChange,
    p_movement_type:   payload.adjustment_type,
    p_reason:          payload.reason,
    p_performed_by:    performedBy,
    p_reorder_threshold: payload.reorder_threshold ?? null,
  });
  if (error) throw Err.fromSupabase(error);
  return data;
}

export async function updateThreshold(db, productId, threshold) {
  const { data, error } = await db
    .from('inventory')
    .update({ reorder_threshold: threshold })
    .eq('product_id', productId)
    .select()
    .single();
  if (error) throw Err.fromSupabase(error);
  return data;
}

export async function findLowStock(db) {
  const { data, error } = await db
    .from('inventory')
    .select('*, products(name, product_code, unit)')
    .filter('quantity', 'lte', db.raw('reorder_threshold'));
  if (error) throw Err.fromSupabase(error);
  return data;
}
