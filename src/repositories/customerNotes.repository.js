import { Err } from '../utils/errors.js';
import { getPagination } from '../utils/pagination.js';

export async function findByCustomer(db, customerId, query) {
  const { from, to } = getPagination(query);
  const { data, error, count } = await db
    .from('customer_notes')
    .select('*, employee_profiles!created_by(full_name)', { count: 'exact' })
    .eq('customer_id', customerId)
    .range(from, to)
    .order('created_at', { ascending: false });
  if (error) throw Err.fromSupabase(error);
  return { data, count };
}

export async function create(db, payload) {
  const { data, error } = await db.from('customer_notes').insert(payload).select().single();
  if (error) throw Err.fromSupabase(error);
  return data;
}

export async function remove(db, id) {
  const { error } = await db.from('customer_notes').delete().eq('id', id);
  if (error) throw Err.fromSupabase(error);
}
