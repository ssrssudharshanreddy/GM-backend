import { Err } from '../utils/errors.js';
import { getPagination } from '../utils/pagination.js';

const INVOICE_SELECT = `
  id, invoice_number, customer_id, order_id, status,
  subtotal, gst_amount, total_amount, amount_paid, amount_due,
  issue_date, due_date, paid_at,
  created_at, updated_at,
  customer_profiles(company_name, contact_person, phone, gst_number, address_line1, city, state, pincode),
  orders(order_number)
`;

export async function findAll(db, query) {
  const { from, to } = getPagination(query);
  let q = db
    .from('invoices')
    .select(INVOICE_SELECT, { count: 'exact' })
    .range(from, to)
    .order('created_at', { ascending: false });

  if (query.status)      q = q.eq('status', query.status);
  if (query.customer_id) q = q.eq('customer_id', query.customer_id);
  if (query.dateFrom)    q = q.gte('issue_date', query.dateFrom);
  if (query.dateTo)      q = q.lte('issue_date', query.dateTo);

  const { data, error, count } = await q;
  if (error) throw Err.fromSupabase(error);
  return { data, count };
}

export async function findById(db, id) {
  const { data, error } = await db
    .from('invoices')
    .select(`${INVOICE_SELECT}, invoice_items(*, products(name, product_code, unit))`)
    .eq('id', id)
    .maybeSingle();
  if (error) throw Err.fromSupabase(error);
  return data;
}

export async function findOverdue(db, query) {
  const { from, to } = getPagination(query);
  const { data, error, count } = await db
    .from('invoices')
    .select(INVOICE_SELECT, { count: 'exact' })
    .in('status', ['PENDING', 'PARTIALLY_PAID', 'OVERDUE'])
    .lt('due_date', new Date().toISOString())
    .range(from, to)
    .order('due_date');
  if (error) throw Err.fromSupabase(error);
  return { data, count };
}
