import * as service from '../services/systemSettings.service.js';
import { sendSuccess } from '../utils/response.js';

export async function list(req, res) {
  sendSuccess(res, await service.listAll(req.db));
}
export async function getByKey(req, res) {
  sendSuccess(res, await service.getByKey(req.db, req.params.key));
}
export async function upsert(req, res) {
  sendSuccess(res, await service.upsert(req.db, req.params.key, req.body.value, req.user.id));
}
export async function bulkUpdate(req, res) {
  sendSuccess(res, await service.bulkUpdate(req.db, req.body.settings, req.user.id));
}
