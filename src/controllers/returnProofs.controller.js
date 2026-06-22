import * as service from '../services/returnProofs.service.js';
import { sendSuccess, sendCreated } from '../utils/response.js';

export async function getProofs(req, res) {
  sendSuccess(res, await service.getProofs(req.db, req.params.returnId));
}
export async function upload(req, res) {
  if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });
  sendCreated(res, await service.uploadProof(req.db, req.params.returnId, req.file, req.user.id, req.body.notes));
}
