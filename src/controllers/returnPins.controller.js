import * as service from '../services/returnPins.service.js';
import { sendSuccess, sendCreated } from '../utils/response.js';

export async function generate(req, res) {
  sendCreated(res, await service.generatePin(req.db, req.params.returnId, req.user.id));
}
export async function getPin(req, res) {
  sendSuccess(res, await service.getPin(req.db, req.params.returnId));
}
export async function verify(req, res) {
  sendSuccess(res, await service.verifyPin(req.db, req.params.returnId, req.body, req.user.id));
}
