import * as service from '../services/visits.service.js';
import { sendSuccess, sendCreated } from '../utils/response.js';

export async function list(req, res) {
  const result = await service.listVisits(req.db, req.query);
  sendSuccess(res, result.visits, 200, { pagination: result.pagination });
}
export async function getById(req, res) {
  sendSuccess(res, await service.getVisit(req.db, req.params.id));
}
export async function schedule(req, res) {
  sendCreated(res, await service.scheduleVisit(req.db, req.body, req.user.id));
}
export async function complete(req, res) {
  sendSuccess(res, await service.completeVisit(req.db, req.params.id, req.body, req.user.id));
}
