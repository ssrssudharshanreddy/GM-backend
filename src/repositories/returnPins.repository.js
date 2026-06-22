import { Err } from '../utils/errors.js';

export async function generate(db, returnId, generatedBy) {
  const { data, error } = await db.rpc('generate_return_pin', {
    p_return_id:    returnId,
    p_generated_by: generatedBy,
  });
  if (error) throw Err.fromSupabase(error);
  return data;
}

export async function findActiveByReturn(db, returnId) {
  const { data, error } = await db
    .from('return_pins')
    .select('id, return_id, plain_pin, expires_at, is_used, generated_at')
    .eq('return_id', returnId)
    .eq('is_used', false)
    .gte('expires_at', new Date().toISOString())
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw Err.fromSupabase(error);
  return data;
}

export async function verify(db, returnId, pin, wsId, latitude, longitude) {
  const { data, error } = await db.rpc('verify_return_pin', {
    p_return_id: returnId,
    p_pin:       pin,
    p_ws_id:     wsId,
    p_latitude:  latitude ?? null,
    p_longitude: longitude ?? null,
  });
  if (error) throw Err.fromSupabase(error);
  return data;
}
