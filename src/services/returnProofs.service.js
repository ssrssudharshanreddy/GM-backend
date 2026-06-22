import * as repo from '../repositories/returnProofs.repository.js';
import * as returnsRepo from '../repositories/returns.repository.js';
import { adminClient } from '../config/supabase.js';
import { env } from '../config/env.js';
import { Err } from '../utils/errors.js';

export async function getProofs(db, returnId) {
  return repo.findByReturn(db, returnId);
}

export async function uploadProof(db, returnId, file, uploadedBy, notes) {
  const ret = await returnsRepo.findById(db, returnId);
  if (!ret) throw Err.notFound('Return');

  const path = `returns/${returnId}/${Date.now()}_${file.originalname}`;
  const { error: uploadError } = await adminClient.storage
    .from(env.SUPABASE_STORAGE_BUCKET_RETURN)
    .upload(path, file.buffer, { contentType: file.mimetype });
  if (uploadError) throw Err.internal('File upload failed');

  const { data: { publicUrl } } = adminClient.storage
    .from(env.SUPABASE_STORAGE_BUCKET_RETURN)
    .getPublicUrl(path);

  return repo.create(db, {
    return_id:      returnId,
    uploaded_by:    uploadedBy,
    file_url:       publicUrl,
    file_name:      file.originalname,
    file_mime_type: file.mimetype,
    notes:          notes ?? null,
  });
}
