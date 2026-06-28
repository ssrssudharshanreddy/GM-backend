import * as service from '../services/orders.service.js';
import { sendSuccess, sendCreated } from '../utils/response.js';

export async function list(req, res) {
  const result = await service.listOrders(req.db, req.query);
  sendSuccess(res, result.orders, 200, { pagination: result.pagination });
}
export async function getById(req, res) {
  sendSuccess(res, await service.getOrder(req.db, req.params.id));
}
export async function create(req, res) {
  const order = await service.placeOrder(req.db, req.body, req.user.id);
  sendCreated(res, order);
}
export async function updateStatus(req, res) {
  const order = await service.updateOrderStatus(req.db, req.params.id, req.body, req.user.id, req.user.role);
  sendSuccess(res, order);
}

export async function deliver(req, res) {
  const result = await service.deliverOrder(req.db, req.params.id, req.body.pin, req.user.id, req.body.latitude, req.body.longitude);
  sendSuccess(res, result);
}
