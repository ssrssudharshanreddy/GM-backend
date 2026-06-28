import { Err } from '../utils/errors.js';
import { getPagination } from '../utils/pagination.js';

export async function findAll(db, query) {
  const { from, to } = getPagination(query);
  let q = db.from('categories').select('*', { count: 'exact' }).is('deleted_at', null).range(from, to).order('name');
  if (query.is_active !== undefined) q = q.eq('is_active', query.is_active === 'true');
  const { data, error, count } = await q;
  if (error) throw Err.fromSupabase(error);
  return { data, count };
}

export async function findById(db, id) {
  const { data, error } = await db.from('categories').select('*').eq('id', id).maybeSingle();
  if (error) throw Err.fromSupabase(error);
  return data;
}

export async function create(db, payload) {
  const { data, error } = await db.from('categories').insert(payload).select().single();
  if (error) throw Err.fromSupabase(error);
  return data;
}

export async function update(db, id, payload) {
  const { data, error } = await db.from('categories').update(payload).eq('id', id).select().single();
  if (error) throw Err.fromSupabase(error);
  return data;
}
