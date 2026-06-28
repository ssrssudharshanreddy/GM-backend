import { Err } from '../utils/errors.js';
import { getPagination } from '../utils/pagination.js';
import { adminClient } from '../config/supabase.js';

function mapProduct(p, invMap) {
  if (!p) return null;
  const { categories, inventory: invJoined, ...rest } = p;
  // Use inventory from the invMap (admin query) if provided, else fall back to joined
  const inventory = invMap?.[p.id] ?? invJoined ?? null;
  const availableQty = (inventory?.quantity ?? 0) - (inventory?.reserved_quantity ?? 0);
  return {
    ...rest,
    category_name:  categories?.name,
    gst_percent:    p.gst_rate ?? 18,
    // Stock fields — used by customer portal
    is_in_stock:    availableQty > 0,
    available_qty:  availableQty,
    inventory_qty:  inventory?.quantity ?? 0,
    // Keep inventory nested for the edit form (used by employee portal)
    inventory: inventory ?? null,
  };
}

export async function findAll(db, query) {
  const { from, to } = getPagination(query);
  let q = db
    .from('products')
    .select('*, categories(name), inventory(*)', { count: 'exact' })
    .range(from, to)
    .order('name');

  if (query.category_id) q = q.eq('category_id', query.category_id);
  if (query.is_active !== undefined) q = q.eq('is_active', query.is_active === 'true');
  if (query.search)      q = q.or(`name.ilike.%${query.search}%,product_code.ilike.%${query.search}%`);

  const { data, error, count } = await q;
  if (error) throw Err.fromSupabase(error);

  return { data: (data || []).map(p => mapProduct(p)), count };
}

export async function findById(db, id) {
  const { data, error } = await db
    .from('products')
    .select('*, categories(name), inventory(*)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw Err.fromSupabase(error);

  // Fetch inventory separately using adminClient to bypass RLS
  const { data: inv } = await adminClient
    .from('inventory')
    .select('*')
    .eq('product_id', id)
    .maybeSingle();

  return mapProduct(data, { [id]: inv });
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
