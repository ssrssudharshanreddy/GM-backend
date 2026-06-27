import * as service from '../services/products.service.js';
import { sendSuccess, sendCreated } from '../utils/response.js';

export async function list(req, res) {
  const result = await service.list(req.db, req.query);
  sendSuccess(res, result.products, 200, { pagination: result.pagination });
}
export async function getById(req, res) {
  sendSuccess(res, await service.getById(req.db, req.params.id));
}
export async function create(req, res) {
  sendCreated(res, await service.create(req.db, req.body, req.files));
}
export async function update(req, res) {
  sendSuccess(res, await service.update(req.db, req.params.id, req.body, req.files));
}
