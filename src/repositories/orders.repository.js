import { Err } from '../utils/errors.js';
import { getPagination } from '../utils/pagination.js';

const ORDER_SELECT = `
  id, order_number, customer_id, status,
  delivery_address, special_instructions,
  subtotal, total_amount, gst_amount,
  cancellation_reason, stock_hold_reason,
  assigned_we_id, assigned_ws_id,
  created_at, updated_at,
  customer_profiles(company_name, contact_person, phone),
  assigned_ws:employee_profiles!assigned_ws_id(full_name),
  order_items(
    id, product_id, quantity, unit_price, gst_rate, gst_amount, line_total,
    products(name, product_code, unit)
  )
`;

function mapOrder(order) {
  if (!order) return null;
  const mapped = { ...order };

  // Flatten customer_profiles
  if (order.customer_profiles) {
    mapped.company_name   = order.customer_profiles.company_name;
    mapped.contact_person = order.customer_profiles.contact_person;
    mapped.phone          = order.customer_profiles.phone;
  }

  // Flatten assigned WS staff name
  mapped.ws_name = order.assigned_ws?.full_name ?? null;

  // Map order_items → items with flattened product fields
  if (Array.isArray(order.order_items)) {
    mapped.item_count = order.order_items.length;
    mapped.items = order.order_items.map(item => ({
      id:            item.id,
      product_id:    item.product_id,
      product_name:  item.products?.name ?? '—',
      product_code:  item.products?.product_code ?? '—',
      unit:          item.products?.unit ?? 'pcs',
      quantity:      item.quantity,
      unit_price:    item.unit_price,
      gst_percent:   item.gst_rate ?? 0,
      gst_amount:    item.gst_amount,
      total_amount:  item.line_total,
    }));
  } else {
    mapped.item_count = 0;
    mapped.items = [];
  }

  // Alias column names for frontend compatibility
  mapped.subtotal_amount = order.subtotal ?? 0;
  mapped.tax_total       = order.gst_amount ?? 0;
  mapped.grand_total     = order.total_amount ?? 0;

  // Stringify delivery_address JSONB → readable string (avoids React render error)
  if (order.delivery_address && typeof order.delivery_address === 'object') {
    const a = order.delivery_address;
    const l1 = a.address_line1 || a.line1;
    const l2 = a.address_line2 || a.line2;
    const parts = [
      l1,
      l2,
      a.city,
      a.state,
      a.pincode,
    ].filter(Boolean);
    mapped.delivery_address        = parts.join(', ');
    mapped.delivery_address_line1  = l1;
    mapped.delivery_address_line2  = l2;
    mapped.delivery_city           = a.city;
    mapped.delivery_state          = a.state;
    mapped.delivery_pincode        = a.pincode;
  } else {
    mapped.delivery_address = order.delivery_address ?? '—';
  }

  return mapped;
}

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
  return { data: (data || []).map(mapOrder), count };
}

export async function findById(db, id) {
  const { data, error } = await db
    .from('orders')
    .select(ORDER_SELECT)
    .eq('id', id)
    .maybeSingle();
  if (error) throw Err.fromSupabase(error);
  return mapOrder(data);
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

