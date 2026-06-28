import { Err } from '../utils/errors.js';
import { getPagination } from '../utils/pagination.js';

function mapInventoryItem(item) {
  if (!item) return null;
  return {
    ...item,
    id: item.product_id,
    allocated_quantity: item.reserved_quantity ?? 0,
    available_quantity: item.available_quantity ?? (item.quantity - (item.reserved_quantity ?? 0)),
    gst_percent: item.gst_rate ?? 18
  };
}

export async function findAll(db, query) {
  const { from, to } = getPagination(query);
  let q = db
    .from('v_inventory_health')
    .select('*', { count: 'exact' });

  if (query.product_id) {
    q = q.eq('product_id', query.product_id);
  }
  if (query.low_stock === 'true' || query.low_stock === true) {
    q = q.eq('is_below_threshold', true);
  }
  if (query.search) {
    q = q.or(`product_name.ilike.%${query.search}%,product_code.ilike.%${query.search}%`);
  }

  q = q.range(from, to)
       .order('product_name', { ascending: true });

  const { data, error, count } = await q;
  if (error) throw Err.fromSupabase(error);
  return { data: (data || []).map(mapInventoryItem), count };
}

export async function findByProduct(db, productId) {
  const { data, error } = await db
    .from('v_inventory_health')
    .select('*')
    .eq('product_id', productId)
    .maybeSingle();
  if (error) throw Err.fromSupabase(error);
  return mapInventoryItem(data);
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
  // Step 1: Get or create inventory row
  const { data: existing, error: fetchErr } = await db
    .from('inventory')
    .select('quantity, reserved_quantity, reorder_threshold')
    .eq('product_id', productId)
    .maybeSingle();
  if (fetchErr) throw Err.fromSupabase(fetchErr);

  const qtyBefore = existing?.quantity ?? 0;
  const newQty = Math.max(0, qtyBefore + Number(quantityChange));
  const newThreshold = payload.reorder_threshold !== undefined && payload.reorder_threshold !== null
    ? Number(payload.reorder_threshold)
    : (existing?.reorder_threshold ?? 0);

  // Step 2: Upsert inventory row
  const { data: inv, error: upsertErr } = await db
    .from('inventory')
    .upsert(
      {
        product_id: productId,
        quantity: newQty,
        reorder_threshold: newThreshold,
        ...(quantityChange > 0 ? { last_restocked_at: new Date().toISOString() } : {}),
      },
      { onConflict: 'product_id' }
    )
    .select()
    .single();
  if (upsertErr) throw Err.fromSupabase(upsertErr);

  // Step 3: Log the movement (only if quantity actually changed)
  if (quantityChange !== 0) {
    const adjustmentType = Number(quantityChange) >= 0 ? 'ADD' : 'REMOVE';
    await db.from('inventory_movements').insert({
      product_id:      productId,
      adjustment_type: adjustmentType,
      quantity_change: Number(quantityChange),
      quantity_before: qtyBefore,
      quantity_after:  newQty,
      reference_type:  'manual',
      reason:          payload.reason || null,
      performed_by:    performedBy || null,
    });
  }

  return inv;
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
    .from('v_inventory_health')
    .select('*')
    .eq('is_below_threshold', true);
  if (error) throw Err.fromSupabase(error);
  return (data || []).map(mapInventoryItem);
}
