import { Err } from '../utils/errors.js';
import { getPagination } from '../utils/pagination.js';

const RETURN_SELECT = `
  id, return_number, customer_id, order_id, status, return_type, notes, proof_urls,
  pickup_scheduled_date, assigned_ws_id, rejection_reason,
  created_at, updated_at,
  customer_profiles(company_name, contact_person_name, contact_phone, delivery_address),
  orders(order_number, delivery_address),
  return_items(
    id, order_item_id, product_id, quantity, reason, outcome, outcome_notes,
    products(name, product_code, unit)
  )
`;

function mapReturn(ret) {
  if (!ret) return null;
  const mapped = { ...ret };
  if (ret.customer_profiles) {
    mapped.company_name = ret.customer_profiles.company_name;
    mapped.contact_person = ret.customer_profiles.contact_person_name;
    mapped.phone = ret.customer_profiles.contact_phone;
  }
  if (ret.orders) {
    mapped.order_number = ret.orders.order_number;
    let da = ret.orders.delivery_address;
    if (typeof da === 'string') {
      try { da = JSON.parse(da); } catch(e) {}
    }
    if (da && typeof da === 'object' && Object.keys(da).length > 0) {
      mapped.pickup_address = [da.line1, da.line2, da.city, da.state, da.pincode].filter(Boolean).join(', ');
    } else if (ret.customer_profiles && ret.customer_profiles.delivery_address) {
      let cda = ret.customer_profiles.delivery_address;
      if (typeof cda === 'string') {
        try { cda = JSON.parse(cda); } catch(e) {}
      }
      if (cda && typeof cda === 'object' && Object.keys(cda).length > 0) {
        mapped.pickup_address = [cda.line1, cda.line2, cda.city, cda.state, cda.pincode].filter(Boolean).join(', ');
      } else {
        mapped.pickup_address = '—';
      }
    } else {
      mapped.pickup_address = '—';
    }
  } else {
    mapped.pickup_address = '—';
  }
  
  if (Array.isArray(ret.return_items)) {
    mapped.item_count = ret.return_items.length;
    mapped.items = ret.return_items.map(item => ({
      id: item.id,
      order_item_id: item.order_item_id,
      product_id: item.product_id,
      quantity: item.quantity,
      reason: item.reason,
      outcome: item.outcome,
      outcome_notes: item.outcome_notes,
      product_name: item.products?.name ?? '—',
      product_code: item.products?.product_code ?? '—',
      unit: item.products?.unit ?? '—'
    }));
    mapped.reason = mapped.items.length > 0 ? mapped.items[0].reason : '—';
  } else {
    mapped.items = [];
    mapped.item_count = 0;
    mapped.reason = '—';
  }
  
  return mapped;
}

export async function findAll(db, query) {
  const { from, to } = getPagination(query);
  let q = db
    .from('returns')
    .select(RETURN_SELECT, { count: 'exact' })
    .range(from, to)
    .order('created_at', { ascending: false });
  if (query.status)      q = q.eq('status', query.status);
  if (query.customer_id) q = q.eq('customer_id', query.customer_id);
  if (query.dateFrom)    q = q.gte('created_at', query.dateFrom);
  if (query.dateTo)      q = q.lte('created_at', query.dateTo);
  const { data, error, count } = await q;
  if (error) throw Err.fromSupabase(error);
  return { data: (data || []).map(mapReturn), count };
}

export async function findById(db, id) {
  const { data, error } = await db.from('returns').select(RETURN_SELECT).eq('id', id).maybeSingle();
  if (error) throw Err.fromSupabase(error);
  return mapReturn(data);
}

export async function create(db, payload) {
  const { data, error } = await db.rpc('create_return', payload);
  if (error) throw Err.fromSupabase(error);
  return data;
}

export async function updateStatus(db, id, payload) {
  const { data, error } = await db.from('returns').update(payload).eq('id', id).select().single();
  if (error) throw Err.fromSupabase(error);
  return mapReturn(data);
}

export async function addProofUrl(db, id, url) {
  // Use SQL array append via an RPC, or just fetch and update.
  // Since we can't easily array_append via PostgREST update without an RPC,
  // we will fetch the current array, append, and update.
  const current = await findById(db, id);
  const updatedUrls = [...(current.proof_urls || []), url];
  const { data, error } = await db.from('returns').update({ proof_urls: updatedUrls }).eq('id', id).select().single();
  if (error) throw Err.fromSupabase(error);
  return mapReturn(data);
}

export async function updateItemOutcomes(db, items) {
  const results = [];
  for (const item of items) {
    const { data, error } = await db
      .from('return_items')
      .update({ outcome: item.outcome, outcome_notes: item.outcome_notes })
      .eq('id', item.id)
      .select()
      .single();
    if (error) throw Err.fromSupabase(error);
    results.push(data);
  }
  return results;
}

