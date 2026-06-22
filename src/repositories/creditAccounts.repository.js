import { Err } from '../utils/errors.js';
import { getPagination } from '../utils/pagination.js';

export async function findAll(db, query) {
  const { from, to } = getPagination(query);
  let q = db
    .from('credit_accounts')
    .select('*, customer_profiles(company_name, contact_person, phone)', { count: 'exact' })
    .range(from, to)
    .order('created_at', { ascending: false });
  if (query.is_frozen !== undefined) q = q.eq('is_frozen', query.is_frozen === 'true');
  const { data, error, count } = await q;
  if (error) throw Err.fromSupabase(error);
  return { data, count };
}

export async function findByCustomer(db, customerId) {
  const { data, error } = await db.from('credit_accounts').select('*').eq('customer_id', customerId).maybeSingle();
  if (error) throw Err.fromSupabase(error);
  return data;
}

export async function create(db, payload) {
  const { data, error } = await db.from('credit_accounts').insert(payload).select().single();
  if (error) throw Err.fromSupabase(error);
  return data;
}

export async function update(db, customerId, payload) {
  const { data, error } = await db.from('credit_accounts').update(payload).eq('customer_id', customerId).select().single();
  if (error) throw Err.fromSupabase(error);
  return data;
}

export async function findHistory(db, customerId, query) {
  const { from, to } = getPagination(query);
  const { data, error, count } = await db
    .from('credit_history')
    .select('*', { count: 'exact' })
    .eq('customer_id', customerId)
    .range(from, to)
    .order('created_at', { ascending: false });
  if (error) throw Err.fromSupabase(error);
  return { data, count };
}
