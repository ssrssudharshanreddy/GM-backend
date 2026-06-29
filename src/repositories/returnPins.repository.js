import { Err } from '../utils/errors.js';

export async function generate(db, returnId, generatedBy) {
  // Invalidate any existing active PINs for this return
  await db.from('return_pins')
    .update({ is_active: false, invalidated_at: new Date().toISOString(), invalidated_reason: 'New PIN generated' })
    .eq('return_id', returnId)
    .eq('is_active', true);

  // Generate a random 6-digit PIN
  const plainPin = Math.floor(100000 + Math.random() * 900000).toString();

  const { data, error } = await db.from('return_pins').insert({
    return_id: returnId,
    pin_hash: plainPin, // Storing plain PIN in pin_hash column since there is no plain_pin column
    is_active: true,
    generated_by: generatedBy,
    max_attempts: 5,
    attempt_count: 0
  }).select().single();

  if (error) throw Err.fromSupabase(error);
  return data;
}

export async function findActiveByReturn(db, returnId) {
  const { data, error } = await db
    .from('return_pins')
    .select('*')
    .eq('return_id', returnId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw Err.fromSupabase(error);
  return data;
}

export async function verify(db, returnId, pin, wsId, latitude, longitude) {
  const activePin = await findActiveByReturn(db, returnId);
  if (!activePin) {
    throw Err.unprocessable('No active return PIN found for this return request.');
  }

  if (activePin.attempt_count >= activePin.max_attempts) {
    await db.from('return_pins').update({ is_active: false, invalidated_reason: 'Max attempts reached' }).eq('id', activePin.id);
    throw Err.unprocessable('Maximum attempts reached. Please request a new PIN.');
  }

  if (activePin.pin_hash !== pin) {
    await db.from('return_pins').update({ attempt_count: activePin.attempt_count + 1 }).eq('id', activePin.id);
    throw Err.unprocessable('Invalid PIN.');
  }

  // Pin is correct, mark as verified and inactive
  const { error } = await db.from('return_pins').update({
    is_active: false,
    verified_at: new Date().toISOString(),
    verified_by: wsId
  }).eq('id', activePin.id);

  if (error) throw Err.fromSupabase(error);
  return { success: true };
}
