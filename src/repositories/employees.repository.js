import { Err } from '../utils/errors.js';
import { getPagination } from '../utils/pagination.js';

export async function findAll(db, query) {
  const { from, to } = getPagination(query);
  let q = db
    .from('employee_profiles')
    .select('*', { count: 'exact' })
    .is('deleted_at', null)
    .range(from, to)
    .order('created_at', { ascending: false });

  if (query.role)   q = q.eq('role', query.role);
  if (query.status) q = q.eq('status', query.status);
  if (query.search) q = q.ilike('full_name', `%${query.search}%`);

  const { data, error, count } = await q;
  if (error) throw Err.fromSupabase(error);
  return { data, count };
}

export async function findById(db, id) {
  const { data, error } = await db
    .from('employee_profiles')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();
  if (error) throw Err.fromSupabase(error);
  return data;
}

export async function create(db, payload) {
  const { data, error } = await db
    .from('employee_profiles')
    .insert(payload)
    .select()
    .single();
  if (error) throw Err.fromSupabase(error);
  return data;
}

export async function update(db, id, payload) {
  const { data, error } = await db
    .from('employee_profiles')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw Err.fromSupabase(error);
  return data;
}

export async function softDelete(db, id) {
  const { error } = await db
    .from('employee_profiles')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw Err.fromSupabase(error);
}
