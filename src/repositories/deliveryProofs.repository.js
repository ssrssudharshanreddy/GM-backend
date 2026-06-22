import { Err } from '../utils/errors.js';

export async function findByOrder(db, orderId) {
  const { data, error } = await db
    .from('delivery_proofs')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false });
  if (error) throw Err.fromSupabase(error);
  return data;
}

export async function create(db, payload) {
  const { data, error } = await db.from('delivery_proofs').insert(payload).select().single();
  if (error) throw Err.fromSupabase(error);
  return data;
}
