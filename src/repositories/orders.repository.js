import { Err } from '../utils/errors.js';
import { getPagination } from '../utils/pagination.js';

const ORDER_SELECT = `
  id, order_number, customer_id, status,
  delivery_address, special_instructions,
  total_amount, gst_amount, grand_total,
  cancellation_reason, stock_hold_reason,
  assigned_we_id, assigned_ws_id,
  created_at, updated_at,
  customer_profiles(company_name, contact_person, phone),
  order_items(
    id, product_id, quantity, unit_price, gst_rate, gst_amount, line_total,
    products(name, product_code, unit)
  )
`;

export async function findAll(db, query) {
  const { from, to } = getPagination(query);
  let q = db
    .from('orders')
    .select(ORDER_SELECT, { count: 'exact' })
    .range(from, to)
    .order('created_at', { ascending: false });

  if (query.status)      q = q.eq('status', query.status);
  if (query.customer_id) q = q.eq('customer_id', query.customer_id);
  if (query.dateFrom)    q = q.gte('created_at', query.dateFrom);
  if (query.dateTo)      q = q.lte('created_at', query.dateTo);

  const { data, error, count } = await q;
  if (error) throw Err.fromSupabase(error);
  return { data, count };
}

export async function findById(db, id) {
  const { data, error } = await db
    .from('orders')
    .select(ORDER_SELECT)
    .eq('id', id)
    .maybeSingle();
  if (error) throw Err.fromSupabase(error);
  return data;
}

export async function create(db, payload) {
  const { data, error } = await db.rpc('place_order', payload);
  if (error) throw Err.fromSupabase(error);
  return data;
}

export async function updateStatus(db, id, payload) {
  const { data, error } = await db
    .from('orders')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw Err.fromSupabase(error);
  return data;
}
