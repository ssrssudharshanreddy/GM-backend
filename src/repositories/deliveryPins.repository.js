import { Err } from '../utils/errors.js';
import crypto from 'crypto';

export async function generate(db, orderId, generatedBy) {
  // Invalidate any existing active PINs for this order
  await db.from('delivery_pins')
    .update({ is_active: false, invalidated_at: new Date().toISOString(), invalidated_reason: 'New PIN generated' })
    .eq('order_id', orderId)
    .eq('is_active', true);

  // Generate a random 6-digit PIN
  const plainPin = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Store it plainly (and optionally hash it, but plain_pin is required for customer portal)
  const pinHash = crypto.createHash('sha256').update(plainPin).digest('hex');

  const { data, error } = await db.from('delivery_pins').insert({
    order_id: orderId,
    plain_pin: plainPin,
    pin_hash: pinHash,
    is_active: true,
    generated_by: generatedBy,
    max_attempts: 5,
    attempt_count: 0
  }).select().single();

  if (error) throw Err.fromSupabase(error);
  return data;
}

export async function findActiveByOrder(db, orderId) {
  const { data, error } = await db
    .from('delivery_pins')
    .select('*')
    .eq('order_id', orderId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw Err.fromSupabase(error);
  return data;
}

export async function verify(db, orderId, pin, wsId, latitude, longitude) {
  const activePin = await findActiveByOrder(db, orderId);
  if (!activePin) {
    throw Err.unprocessable('No active delivery PIN found for this order.');
  }

  if (activePin.attempt_count >= activePin.max_attempts) {
    await db.from('delivery_pins').update({ is_active: false, invalidated_reason: 'Max attempts reached' }).eq('id', activePin.id);
    throw Err.unprocessable('Maximum attempts reached. Please request a new PIN.');
  }

  if (activePin.plain_pin !== pin) {
    await db.from('delivery_pins').update({ attempt_count: activePin.attempt_count + 1 }).eq('id', activePin.id);
    throw Err.unprocessable('Invalid PIN.');
  }

  // Pin is correct, mark as verified and inactive
  const { error } = await db.from('delivery_pins').update({
    is_active: false,
    verified_at: new Date().toISOString(),
    verified_by: wsId,
    verified_latitude: latitude ?? null,
    verified_longitude: longitude ?? null
  }).eq('id', activePin.id);

  if (error) throw Err.fromSupabase(error);

  // Mark the order as DELIVERED
  const { error: orderError } = await db.from('orders').update({
    status: 'DELIVERED',
    updated_at: new Date().toISOString()
  }).eq('id', orderId);

  if (orderError) throw Err.fromSupabase(orderError);

  return { success: true };
}
