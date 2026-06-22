import { Err } from '../utils/errors.js';
import { getPagination } from '../utils/pagination.js';

export async function findAll(db, query) {
  const { from, to } = getPagination(query);
  let q = db
    .from('payment_commitments')
    .select('*, customer_profiles(company_name), invoices(invoice_number), employee_profiles!created_by(full_name)', { count: 'exact' })
    .range(from, to)
    .order('commitment_date');
  if (query.customer_id) q = q.eq('customer_id', query.customer_id);
  if (query.status)      q = q.eq('status', query.status);
  const { data, error, count } = await q;
  if (error) throw Err.fromSupabase(error);
  return { data, count };
}

export async function findById(db, id) {
  const { data, error } = await db.from('payment_commitments').select('*').eq('id', id).maybeSingle();
  if (error) throw Err.fromSupabase(error);
  return data;
}

export async function create(db, payload) {
  const { data, error } = await db.from('payment_commitments').insert(payload).select().single();
  if (error) throw Err.fromSupabase(error);
  return data;
}

export async function update(db, id, payload) {
  const { data, error } = await db.from('payment_commitments').update(payload).eq('id', id).select().single();
  if (error) throw Err.fromSupabase(error);
  return data;
}
