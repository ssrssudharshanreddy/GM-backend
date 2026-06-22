import * as repo from '../repositories/deliveryPins.repository.js';
import * as ordersRepo from '../repositories/orders.repository.js';
import { Err } from '../utils/errors.js';

export async function generatePin(db, orderId, generatedBy) {
  const order = await ordersRepo.findById(db, orderId);
  if (!order) throw Err.notFound('Order');
  if (!['DISPATCHED'].includes(order.status)) {
    throw Err.unprocessable('Delivery PIN can only be generated for dispatched orders');
  }
  return repo.generate(db, orderId, generatedBy);
}

export async function getPin(db, orderId) {
  const pin = await repo.findActiveByOrder(db, orderId);
  if (!pin) throw Err.notFound('Active delivery PIN');
  return pin;
}

export async function verifyPin(db, orderId, body, wsId) {
  const result = await repo.verify(db, orderId, body.pin, wsId, body.latitude, body.longitude);
  if (!result || result.verified === false) {
    throw Err.badRequest('Invalid or expired PIN');
  }
  return result;
}
