import * as repo from '../repositories/deliveryProofs.repository.js';
import * as ordersRepo from '../repositories/orders.repository.js';
import { adminClient } from '../config/supabase.js';
import { env } from '../config/env.js';
import { Err } from '../utils/errors.js';

export async function getProofs(db, orderId) {
  return repo.findByOrder(db, orderId);
}

export async function uploadProof(db, orderId, file, uploadedBy, notes) {
  const order = await ordersRepo.findById(db, orderId);
  if (!order) throw Err.notFound('Order');
  if (order.status !== 'DISPATCHED') {
    throw Err.unprocessable('Proof can only be uploaded for dispatched orders');
  }

  const path = `orders/${orderId}/${Date.now()}_${file.originalname}`;
  const { error: uploadError } = await adminClient.storage
    .from(env.SUPABASE_STORAGE_BUCKET_DELIVERY)
    .upload(path, file.buffer, { contentType: file.mimetype });
  if (uploadError) throw Err.internal('File upload failed');

  const { data: { publicUrl } } = adminClient.storage
    .from(env.SUPABASE_STORAGE_BUCKET_DELIVERY)
    .getPublicUrl(path);

  return repo.create(db, {
    order_id:       orderId,
    uploaded_by:    uploadedBy,
    file_url:       publicUrl,
    file_name:      file.originalname,
    file_mime_type: file.mimetype,
    notes:          notes ?? null,
  });
}
