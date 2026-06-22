import * as service from '../services/creditAccounts.service.js';
import { sendSuccess, sendCreated } from '../utils/response.js';

export async function list(req, res) {
  const result = await service.list(req.db, req.query);
  sendSuccess(res, result.accounts, 200, { pagination: result.pagination });
}
export async function getByCustomer(req, res) {
  sendSuccess(res, await service.getByCustomer(req.db, req.params.customerId));
}
export async function create(req, res) {
  sendCreated(res, await service.create(req.db, req.body, req.user.id));
}
export async function updateLimit(req, res) {
  sendSuccess(res, await service.updateLimit(req.db, req.params.customerId, req.body, req.user.id));
}
export async function freeze(req, res) {
  sendSuccess(res, await service.freeze(req.db, req.params.customerId, req.body.reason, req.user.id));
}
export async function unfreeze(req, res) {
  sendSuccess(res, await service.unfreeze(req.db, req.params.customerId, req.user.id));
}
export async function getHistory(req, res) {
  const result = await service.getHistory(req.db, req.params.customerId, req.query);
  sendSuccess(res, result.history, 200, { pagination: result.pagination });
}
