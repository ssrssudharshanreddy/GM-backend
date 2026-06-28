import * as service from '../services/returns.service.js';
import { sendSuccess, sendCreated } from '../utils/response.js';

export async function list(req, res) {
  const result = await service.listReturns(req.db, req.query);
  sendSuccess(res, result.returns, 200, { pagination: result.pagination });
}
export async function getById(req, res) {
  sendSuccess(res, await service.getReturn(req.db, req.params.id));
}
export async function create(req, res) {
  sendCreated(res, await service.createReturn(req.db, req.body, req.user.id));
}
export async function updateStatus(req, res) {
  // Pass actorRole so the service can allow CEO to override state machine transitions
  sendSuccess(res, await service.updateReturnStatus(req.db, req.params.id, req.body, req.user.id, req.user.role));
}
export async function updateItemOutcomes(req, res) {
  sendSuccess(res, await service.updateItemOutcomes(req.db, req.params.id, req.body));
}
export async function collect(req, res) {
  sendSuccess(res, await service.collectReturn(req.db, req.params.id, req.body, req.user.id));
}
