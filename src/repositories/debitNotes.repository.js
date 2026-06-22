import { Err } from '../utils/errors.js';
import { getPagination } from '../utils/pagination.js';

export async function findAll(db, query) {
  const { from, to } = getPagination(query);
  let q = db
    .from('debit_notes')
    .select('*, customer_profiles(company_name)', { count: 'exact' })
    .range(from, to)
    .order('created_at', { ascending: false });
  if (query.customer_id) q = q.eq('customer_id', query.customer_id);
  const { data, error, count } = await q;
  if (error) throw Err.fromSupabase(error);
  return { data, count };
}

export async function findById(db, id) {
  const { data, error } = await db.from('debit_notes').select('*').eq('id', id).maybeSingle();
  if (error) throw Err.fromSupabase(error);
  return data;
}

export async function create(db, payload) {
  const { data, error } = await db.from('debit_notes').insert(payload).select().single();
  if (error) throw Err.fromSupabase(error);
  return data;
}
