import * as service from '../services/deliveryProofs.service.js';
import { sendSuccess, sendCreated } from '../utils/response.js';

export async function getProofs(req, res) {
  sendSuccess(res, await service.getProofs(req.db, req.params.orderId));
}
export async function upload(req, res) {
  if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });
  const proof = await service.uploadProof(req.db, req.params.orderId, req.file, req.user.id, req.body.notes);
  sendCreated(res, proof);
}
