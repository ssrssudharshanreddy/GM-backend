import { Err } from '../utils/errors.js';
import { getPagination } from '../utils/pagination.js';

export async function findAll(db, query) {
  const { from, to } = getPagination(query);
  let q = db
    .from('leads')
    .select('*, employee_profiles!assigned_crem_id(full_name)', { count: 'exact' })
    .range(from, to)
    .order('created_at', { ascending: false });
  if (query.status) q = q.eq('status', query.status);
  if (query.search) q = q.ilike('company_name', `%${query.search}%`);
  const { data, error, count } = await q;
  if (error) throw Err.fromSupabase(error);
  return { data, count };
}

export async function findById(db, id) {
  const { data, error } = await db
    .from('leads')
    .select('*, visits(*), follow_ups(*)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw Err.fromSupabase(error);
  return data;
}

export async function create(db, payload) {
  const { data, error } = await db.from('leads').insert(payload).select().single();
  if (error) throw Err.fromSupabase(error);
  return data;
}

export async function update(db, id, payload) {
  const { data, error } = await db.from('leads').update(payload).eq('id', id).select().single();
  if (error) throw Err.fromSupabase(error);
  return data;
}
