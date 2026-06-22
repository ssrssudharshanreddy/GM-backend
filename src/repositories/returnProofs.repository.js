import { Err } from '../utils/errors.js';

export async function findByReturn(db, returnId) {
  const { data, error } = await db
    .from('return_proofs')
    .select('*')
    .eq('return_id', returnId)
    .order('created_at', { ascending: false });
  if (error) throw Err.fromSupabase(error);
  return data;
}

export async function create(db, payload) {
  const { data, error } = await db.from('return_proofs').insert(payload).select().single();
  if (error) throw Err.fromSupabase(error);
  return data;
}
