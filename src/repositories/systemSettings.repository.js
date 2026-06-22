import { Err } from '../utils/errors.js';

export async function findAll(db) {
  const { data, error } = await db.from('system_settings').select('*').order('key');
  if (error) throw Err.fromSupabase(error);
  return data;
}

export async function findByKey(db, key) {
  const { data, error } = await db.from('system_settings').select('*').eq('key', key).maybeSingle();
  if (error) throw Err.fromSupabase(error);
  return data;
}

export async function upsert(db, key, value, updatedBy) {
  const { data, error } = await db
    .from('system_settings')
    .upsert({ key, value: String(value), updated_by: updatedBy }, { onConflict: 'key' })
    .select()
    .single();
  if (error) throw Err.fromSupabase(error);
  return data;
}
