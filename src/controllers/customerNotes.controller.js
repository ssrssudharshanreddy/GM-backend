import * as service from '../services/customerNotes.service.js';
import { sendSuccess, sendCreated, sendNoContent } from '../utils/response.js';

export async function list(req, res) {
  const result = await service.listNotes(req.db, req.params.customerId, req.query);
  sendSuccess(res, result.notes, 200, { pagination: result.pagination });
}
export async function create(req, res) {
  sendCreated(res, await service.addNote(req.db, req.params.customerId, req.body, req.user.id));
}
export async function remove(req, res) {
  await service.deleteNote(req.db, req.params.id);
  sendNoContent(res);
}
