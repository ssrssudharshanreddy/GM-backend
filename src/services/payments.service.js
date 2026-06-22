import * as repo from '../repositories/payments.repository.js';
import { adminClient } from '../config/supabase.js';
import { env } from '../config/env.js';
import { Err } from '../utils/errors.js';
import { buildPaginationMeta } from '../utils/pagination.js';
import path from 'path';

/** Strip path traversal characters from a user-supplied filename */
function sanitizeFilename(name) {
  return path.basename(name).replace(/[^a-zA-Z0-9._\-]/g, '_');
}

export async function listPayments(db, query) {
  const { data, count } = await repo.findAll(db, query);
  return { payments: data, pagination: buildPaginationMeta({ page: query.page, limit: query.limit, total: count }) };
}

export async function getPayment(db, id) {
  const p = await repo.findById(db, id);
  if (!p) throw Err.notFound('Payment');
  return p;
}

export async function submitPayment(db, body, customerId) {
  return repo.create(db, {
    ...body,
    customer_id: customerId,
    status: 'PENDING_VERIFICATION',
  });
}

export async function verifyPayment(db, id, body, actorId) {
  const p = await repo.findById(db, id);
  if (!p) throw Err.notFound('Payment');
  if (p.status !== 'PENDING_VERIFICATION') throw Err.unprocessable('Payment is not pending verification');

  return repo.update(db, id, {
    status:           body.status,
    verified_by:      actorId,
    verified_at:      new Date().toISOString(),
    rejection_reason: body.rejection_reason ?? null,
  });
}

export async function markDishonored(db, id, body, actorId) {
  const p = await repo.findById(db, id);
  if (!p) throw Err.notFound('Payment');
  if (p.status !== 'VERIFIED') throw Err.unprocessable('Only verified payments can be marked dishonored');

  return repo.update(db, id, {
    status:          'DISHONORED',
    dishonored_at:   body.dishonored_at,
    dishonor_reason: body.dishonor_reason,
  });
}

/**
 * Upload a payment receipt to private storage.
 * Stores the path — callers retrieve signed URLs via getPayment enrichment.
 */
export async function uploadReceipt(db, paymentId, file, uploadedBy) {
  const safeFilename = sanitizeFilename(file.originalname);
  const storagePath = `payments/${paymentId}/${Date.now()}_${safeFilename}`;

  const { error } = await adminClient.storage
    .from(env.SUPABASE_STORAGE_BUCKET_DOCS)
    .upload(storagePath, file.buffer, { contentType: file.mimetype });
  if (error) throw Err.internal('File upload failed');

  // Store storage_path, not a public URL — generate signed URLs on demand
  return repo.uploadReceipt(db, paymentId, storagePath, safeFilename, file.mimetype, uploadedBy);
}
