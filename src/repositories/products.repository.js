import { Err } from '../utils/errors.js';
import { getPagination } from '../utils/pagination.js';

function mapProduct(p) {
  if (!p) return null;
  const { categories, ...rest } = p;
  return {
    ...rest,
    category_name: categories?.name,
    gst_percent: p.gst_rate ?? 18
  };
}

export async function findAll(db, query) {
  const { from, to } = getPagination(query);
  let q = db
    .from('products')
    .select('*, categories(name)', { count: 'exact' })
    .range(from, to)
    .order('name');

  if (query.category_id) q = q.eq('category_id', query.category_id);
  if (query.is_active !== undefined) q = q.eq('is_active', query.is_active === 'true');
  if (query.search)      q = q.or(`name.ilike.%${query.search}%,product_code.ilike.%${query.search}%`);

  const { data, error, count } = await q;
  if (error) throw Err.fromSupabase(error);
  return { data: (data || []).map(mapProduct), count };
}

export async function findById(db, id) {
  const { data, error } = await db
    .from('products')
    .select('*, categories(name), inventory(*)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw Err.fromSupabase(error);
  return mapProduct(data);
}

export async function create(db, payload) {
  const { data, error } = await db.from('products').insert(payload).select('*, categories(name)').single();
  if (error) throw Err.fromSupabase(error);
  return mapProduct(data);
}

export async function update(db, id, payload) {
  const { data, error } = await db.from('products').update(payload).eq('id', id).select('*, categories(name)').single();
  if (error) throw Err.fromSupabase(error);
  return mapProduct(data);
}
