/**
 * Business logic for customer self-service actions.
 * Uses correct customer_profiles column names from the DB schema.
 */
import { adminClient } from '../config/supabase.js';
import { env } from '../config/env.js';
import { Err } from '../utils/errors.js';
import path from 'path';

function sanitizeFilename(name) {
  return path.basename(name).replace(/[^a-zA-Z0-9._\-]/g, '_');
}

/** Returns the customer's own profile including current application status */
export async function getMyApplication(db, customerId) {
  const { data, error } = await db
    .from('customer_profiles')
    .select('id,status,company_name,contact_person_name,contact_email,contact_phone,registered_address,created_at')
    .eq('id', customerId)
    .maybeSingle();
  if (error) throw Err.fromSupabase(error);
  if (!data) throw Err.notFound('Customer profile');
  return { profile: data };
}

/**
 * Customer-visible notes: ACTION_REQUIRED type notes only
 * (the only note_type explicitly intended to prompt customer action).
 */
export async function getMyApplicationNotes(db, customerId) {
  const { data, error } = await db
    .from('customer_notes')
    .select('id,content,note_type,created_at')
    .eq('customer_id', customerId)
    .eq('note_type', 'ACTION_REQUIRED')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    return { notes: [] };
  }
  // Alias content → note for frontend compatibility
  return { notes: (data ?? []).map(n => ({ ...n, note: n.content })) };
}

/** Customer uploads a document for their own application */
export async function uploadMyDocument(db, customerId, file) {
  const safeFilename = sanitizeFilename(file.originalname);
  const storagePath = `applications/${customerId}/${Date.now()}_${safeFilename}`;

  const { error: uploadError } = await adminClient.storage
    .from(env.SUPABASE_STORAGE_BUCKET_DOCS)
    .upload(storagePath, file.buffer, { contentType: file.mimetype });
  if (uploadError) throw Err.internal('File upload failed');

  const { data, error } = await db
    .from('customer_documents')
    .insert({
      customer_id:    customerId,
      uploaded_by:    customerId,
      storage_path:   storagePath,
      file_name:      safeFilename,
      file_mime_type: file.mimetype,
      document_type:  'OTHER',
    })
    .select()
    .single();
  if (error) throw Err.fromSupabase(error);
  return data;
}
