import * as service from '../services/categories.service.js';
import { sendSuccess, sendCreated } from '../utils/response.js';

export async function list(req, res) {
  const result = await service.list(req.db, req.query);
  sendSuccess(res, result.categories, 200, { pagination: result.pagination });
}
export async function getById(req, res) {
  sendSuccess(res, await service.getById(req.db, req.params.id));
}
export async function create(req, res) {
  sendCreated(res, await service.create(req.db, req.body));
}
export async function update(req, res) {
  sendSuccess(res, await service.update(req.db, req.params.id, req.body));
}
export async function remove(req, res) {
  await service.remove(req.db, req.params.id);
  res.status(204).send();
}
