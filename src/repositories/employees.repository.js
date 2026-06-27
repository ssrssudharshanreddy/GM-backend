import { Err } from '../utils/errors.js';
import { getPagination } from '../utils/pagination.js';
import { adminClient } from '../config/supabase.js';

/**
 * Fetch emails from auth.users for a list of user IDs.
 * Returns a Map<id, email>.
 */
async function fetchEmailsForIds(ids) {
  if (!ids || ids.length === 0) return new Map();
  try {
    const { data, error } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
    if (error || !data?.users) return new Map();
    const map = new Map();
    const idSet = new Set(ids);
    for (const u of data.users) {
      if (idSet.has(u.id)) map.set(u.id, u.email);
    }
    return map;
  } catch {
    return new Map();
  }
}

export async function findAll(db, query) {
  const { from, to } = getPagination(query);
  let q = adminClient
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

  // Merge email from auth.users
  const rows = data || [];
  const emailMap = await fetchEmailsForIds(rows.map(r => r.id));
  const enriched = rows.map(r => ({ ...r, email: emailMap.get(r.id) ?? null }));

  return { data: enriched, count };
}

export async function findById(db, id) {
  const { data, error } = await adminClient
    .from('employee_profiles')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();
  if (error) throw Err.fromSupabase(error);
  if (!data) return null;

  // Merge email from auth.users
  const emailMap = await fetchEmailsForIds([data.id]);
  return { ...data, email: emailMap.get(data.id) ?? null };
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
