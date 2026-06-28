import { Err } from '../utils/errors.js';
import { getPagination } from '../utils/pagination.js';
import { adminClient } from '../config/supabase.js';

export async function findAll(db, query) {
  const { from, to } = getPagination(query);
  let q = db.from('categories').select('*', { count: 'exact' }).is('deleted_at', null).range(from, to).order('name');
  if (query.is_active !== undefined) q = q.eq('is_active', query.is_active === 'true');
  const { data, error, count } = await q;
  if (error) throw Err.fromSupabase(error);

  // Fetch live product count per category using adminClient (bypasses RLS)
  const categoryIds = (data || []).map(c => c.id);
  const countMap = {};
  if (categoryIds.length > 0) {
    const { data: productRows } = await adminClient
      .from('products')
      .select('category_id')
      .in('category_id', categoryIds)
      .eq('is_active', true)
      .is('deleted_at', null);
    (productRows || []).forEach(p => {
      countMap[p.category_id] = (countMap[p.category_id] || 0) + 1;
    });
  }

  return {
    data: (data || []).map(cat => ({ ...cat, product_count: countMap[cat.id] ?? 0 })),
    count,
  };
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
