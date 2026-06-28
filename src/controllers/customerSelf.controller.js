/**
 * Customer-facing self-service controller.
 * All actions here operate on the authenticated customer's own data only.
 */
import * as service from '../services/customerSelf.service.js';
import { sendSuccess, sendCreated } from '../utils/response.js';

/** GET /applications/my — customer's own application + profile status */
export async function getMyApplication(req, res) {
  sendSuccess(res, await service.getMyApplication(req.db, req.user.id));
}

/** GET /applications/my/notes — customer-visible notes on their application */
export async function getMyApplicationNotes(req, res) {
  sendSuccess(res, await service.getMyApplicationNotes(req.db, req.user.id));
}

/** POST /applications/my/documents — customer uploads a document to their own application */
export async function uploadMyDocument(req, res) {
  if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });
  sendCreated(res, await service.uploadMyDocument(req.db, req.user.id, req.file));
}
