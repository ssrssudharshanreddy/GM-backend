import { Err } from '../utils/errors.js';
import { getPagination } from '../utils/pagination.js';

export async function findForUser(db, recipientId, query) {
  const { from, to } = getPagination(query);
  let q = db
    .from('notifications')
    .select('*', { count: 'exact' })
    .eq('recipient_id', recipientId)
    .range(from, to)
    .order('created_at', { ascending: false });
  if (query.is_read !== undefined) q = q.eq('is_read', query.is_read === 'true');
  const { data, error, count } = await q;
  if (error) throw Err.fromSupabase(error);
  return { data, count };
}

export async function countUnread(db, recipientId) {
  const { count, error } = await db
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('recipient_id', recipientId)
    .eq('is_read', false);
  if (error) throw Err.fromSupabase(error);
  return count;
}

export async function markRead(db, id, recipientId) {
  const { data, error } = await db
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', id)
    .eq('recipient_id', recipientId)
    .select()
    .single();
  if (error) throw Err.fromSupabase(error);
  return data;
}

export async function markAllRead(db, recipientId) {
  const { error } = await db
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('recipient_id', recipientId)
    .eq('is_read', false);
  if (error) throw Err.fromSupabase(error);
}

export async function getPreferences(db, recipientId) {
  const { data, error } = await db
    .from('notification_preferences')
    .select('*')
    .eq('user_id', recipientId)
    .maybeSingle();
  if (error) throw Err.fromSupabase(error);
  return data;
}

export async function upsertPreferences(db, recipientId, prefs) {
  const { data, error } = await db
    .from('notification_preferences')
    .upsert({ user_id: recipientId, ...prefs }, { onConflict: 'user_id' })
    .select()
    .single();
  if (error) throw Err.fromSupabase(error);
  return data;
}
