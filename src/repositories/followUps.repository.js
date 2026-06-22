import { Err } from '../utils/errors.js';
import { getPagination } from '../utils/pagination.js';

export async function findAll(db, query) {
  const { from, to } = getPagination(query);
  let q = db
    .from('follow_ups')
    .select('*, employee_profiles!assigned_to(full_name)', { count: 'exact' })
    .range(from, to)
    .order('due_date');
  if (query.assigned_to)  q = q.eq('assigned_to', query.assigned_to);
  if (query.customer_id)  q = q.eq('customer_id', query.customer_id);
  if (query.is_completed !== undefined) q = q.eq('is_completed', query.is_completed === 'true');
  const { data, error, count } = await q;
  if (error) throw Err.fromSupabase(error);
  return { data, count };
}

export async function findById(db, id) {
  const { data, error } = await db.from('follow_ups').select('*').eq('id', id).maybeSingle();
  if (error) throw Err.fromSupabase(error);
  return data;
}

export async function create(db, payload) {
  const { data, error } = await db.from('follow_ups').insert(payload).select().single();
  if (error) throw Err.fromSupabase(error);
  return data;
}

export async function update(db, id, payload) {
  const { data, error } = await db.from('follow_ups').update(payload).eq('id', id).select().single();
  if (error) throw Err.fromSupabase(error);
  return data;
}
