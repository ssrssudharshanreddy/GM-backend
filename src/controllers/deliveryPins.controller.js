import * as service from '../services/deliveryPins.service.js';
import { sendSuccess, sendCreated } from '../utils/response.js';

export async function generate(req, res) {
  sendCreated(res, await service.generatePin(req.db, req.params.orderId, req.user.id));
}
export async function getPin(req, res) {
  sendSuccess(res, await service.getPin(req.db, req.params.orderId));
}
export async function verify(req, res) {
  sendSuccess(res, await service.verifyPin(req.db, req.params.orderId, req.body, req.user.id));
}
