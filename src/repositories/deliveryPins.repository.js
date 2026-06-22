import { Err } from '../utils/errors.js';

export async function generate(db, orderId, generatedBy) {
  const { data, error } = await db.rpc('generate_delivery_pin', {
    p_order_id:      orderId,
    p_generated_by:  generatedBy,
  });
  if (error) throw Err.fromSupabase(error);
  return data;
}

export async function findActiveByOrder(db, orderId) {
  const { data, error } = await db
    .from('delivery_pins')
    .select('id, order_id, plain_pin, expires_at, is_used, generated_at')
    .eq('order_id', orderId)
    .eq('is_used', false)
    .gte('expires_at', new Date().toISOString())
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw Err.fromSupabase(error);
  return data;
}

export async function verify(db, orderId, pin, wsId, latitude, longitude) {
  const { data, error } = await db.rpc('verify_delivery_pin', {
    p_order_id:  orderId,
    p_pin:       pin,
    p_ws_id:     wsId,
    p_latitude:  latitude ?? null,
    p_longitude: longitude ?? null,
  });
  if (error) throw Err.fromSupabase(error);
  return data;
}
