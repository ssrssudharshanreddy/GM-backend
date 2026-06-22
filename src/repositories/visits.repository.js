import { Err } from '../utils/errors.js';
import { getPagination } from '../utils/pagination.js';

export async function findAll(db, query) {
  const { from, to } = getPagination(query);
  let q = db
    .from('visits')
    .select('*, employee_profiles!crem_id(full_name), customer_profiles(company_name), leads(company_name)', { count: 'exact' })
    .range(from, to)
    .order('scheduled_at', { ascending: false });
  if (query.crem_id)     q = q.eq('crem_id', query.crem_id);
  if (query.customer_id) q = q.eq('customer_id', query.customer_id);
  if (query.status)      q = q.eq('status', query.status);
  if (query.dateFrom)    q = q.gte('scheduled_at', query.dateFrom);
  if (query.dateTo)      q = q.lte('scheduled_at', query.dateTo);
  const { data, error, count } = await q;
  if (error) throw Err.fromSupabase(error);
  return { data, count };
}

export async function findById(db, id) {
  const { data, error } = await db.from('visits').select('*, follow_ups(*)').eq('id', id).maybeSingle();
  if (error) throw Err.fromSupabase(error);
  return data;
}

export async function create(db, payload) {
  const { data, error } = await db.from('visits').insert(payload).select().single();
  if (error) throw Err.fromSupabase(error);
  return data;
}

export async function update(db, id, payload) {
  const { data, error } = await db.from('visits').update(payload).eq('id', id).select().single();
  if (error) throw Err.fromSupabase(error);
  return data;
}
