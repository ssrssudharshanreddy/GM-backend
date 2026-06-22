import * as service from '../services/inventory.service.js';
import { sendSuccess, sendCreated } from '../utils/response.js';

export async function list(req, res) {
  const result = await service.listInventory(req.db, req.query);
  sendSuccess(res, result.inventory, 200, { pagination: result.pagination });
}
export async function getByProduct(req, res) {
  sendSuccess(res, await service.getByProduct(req.db, req.params.productId));
}
export async function adjust(req, res) {
  sendSuccess(res, await service.adjustInventory(req.db, req.body, req.user.id));
}
export async function updateThreshold(req, res) {
  sendSuccess(res, await service.updateThreshold(req.db, req.params.productId, req.body.reorder_threshold));
}
export async function listMovements(req, res) {
  const result = await service.listMovements(req.db, req.query);
  sendSuccess(res, result.movements, 200, { pagination: result.pagination });
}
export async function getLowStock(req, res) {
  sendSuccess(res, await service.getLowStock(req.db));
}
