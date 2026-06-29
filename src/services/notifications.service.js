import * as repo from '../repositories/notifications.repository.js';
import { Err } from '../utils/errors.js';
import { buildPaginationMeta } from '../utils/pagination.js';

export async function listNotifications(db, recipientId, query) {
  const { data, count } = await repo.findForUser(db, recipientId, query);
  return { notifications: data, pagination: buildPaginationMeta({ page: query.page, limit: query.limit, total: count }) };
}

export async function unreadCount(db, recipientId) {
  return { unread: await repo.countUnread(db, recipientId) };
}

export async function markRead(db, notificationId, recipientId) {
  return repo.markRead(db, notificationId, recipientId);
}

export async function markAllRead(db, recipientId) {
  await repo.markAllRead(db, recipientId);
}

export async function deleteNotification(db, notificationId, recipientId) {
  await repo.deleteNotification(db, notificationId, recipientId);
}

export async function getPreferences(db, userId) {
  return repo.getPreferences(db, userId);
}

export async function updatePreferences(db, userId, prefs) {
  return repo.upsertPreferences(db, userId, prefs);
}
