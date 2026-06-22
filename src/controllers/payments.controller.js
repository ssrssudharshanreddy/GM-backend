import * as service from '../services/payments.service.js';
import { sendSuccess, sendCreated } from '../utils/response.js';

export async function list(req, res) {
  const result = await service.listPayments(req.db, req.query);
  sendSuccess(res, result.payments, 200, { pagination: result.pagination });
}
export async function getById(req, res) {
  sendSuccess(res, await service.getPayment(req.db, req.params.id));
}
export async function submit(req, res) {
  sendCreated(res, await service.submitPayment(req.db, req.body, req.user.id));
}
export async function verify(req, res) {
  sendSuccess(res, await service.verifyPayment(req.db, req.params.id, req.body, req.user.id));
}
export async function markDishonored(req, res) {
  sendSuccess(res, await service.markDishonored(req.db, req.params.id, req.body, req.user.id));
}
export async function uploadReceipt(req, res) {
  if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });
  sendCreated(res, await service.uploadReceipt(req.db, req.params.id, req.file, req.user.id));
}
