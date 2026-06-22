import * as service from '../services/notifications.service.js';
import { sendSuccess, sendNoContent } from '../utils/response.js';

export async function list(req, res) {
  const result = await service.listNotifications(req.db, req.user.id, req.query);
  sendSuccess(res, result.notifications, 200, { pagination: result.pagination });
}
export async function unreadCount(req, res) {
  sendSuccess(res, await service.unreadCount(req.db, req.user.id));
}
export async function markRead(req, res) {
  sendSuccess(res, await service.markRead(req.db, req.params.id, req.user.id));
}
export async function markAllRead(req, res) {
  await service.markAllRead(req.db, req.user.id);
  sendNoContent(res);
}
export async function getPreferences(req, res) {
  sendSuccess(res, await service.getPreferences(req.db, req.user.id));
}
export async function updatePreferences(req, res) {
  sendSuccess(res, await service.updatePreferences(req.db, req.user.id, req.body));
}
