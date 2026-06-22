import * as customersRepo from '../repositories/customers.repository.js';
import * as authRepo from '../repositories/auth.repository.js';
import { adminClient } from '../config/supabase.js';
import { env } from '../config/env.js';
import { Err } from '../utils/errors.js';
import { buildPaginationMeta } from '../utils/pagination.js';
import path from 'path';

/** Strip path traversal characters from a user-supplied filename */
function sanitizeFilename(name) {
  return path.basename(name).replace(/[^a-zA-Z0-9._\-]/g, '_');
}

/** Generate a short-lived signed URL (1 hour) for a private storage object */
async function getSignedUrl(bucket, storagePath) {
  const { data, error } = await adminClient.storage
    .from(bucket)
    .createSignedUrl(storagePath, 3600);
  if (error) throw Err.internal('Failed to generate document URL');
  return data.signedUrl;
}

export async function listCustomers(db, query) {
  const { data, count } = await customersRepo.findAll(db, query);
  return {
    customers: data,
    pagination: buildPaginationMeta({ page: query.page, limit: query.limit, total: count }),
  };
}

export async function getCustomer(db, id) {
  const customer = await customersRepo.findById(db, id);
  if (!customer) throw Err.notFound('Customer');
  return customer;
}

export async function updateCustomer(db, id, body) {
  const customer = await customersRepo.findById(db, id);
  if (!customer) throw Err.notFound('Customer');
  return customersRepo.update(db, id, body);
}

export async function assignCrem(db, customerId, cremId) {
  return customersRepo.update(db, customerId, { assigned_crem_id: cremId });
}

export async function updateStatus(db, customerId, status) {
  return customersRepo.update(db, customerId, { status });
}

/** Customer self-registers: creates auth user + customer_profile + initial application */
export async function selfRegister(body) {
  // Create Supabase Auth user
  const authUser = await authRepo.createAuthUser({
    email: body.email,
    password: body.password,
    role: 'CUSTOMER',
    full_name: body.company_name,
  });

  // Create customer_profiles row
  const { data: profile, error: profileError } = await adminClient
    .from('customer_profiles')
    .insert({
      id: authUser.id,
      company_name: body.company_name,
      contact_person: body.contact_person,
      phone: body.phone,
      alternate_phone: body.alternate_phone,
      email: body.email,
      gst_number: body.gst_number,
      pan_number: body.pan_number,
      address_line1: body.address_line1,
      address_line2: body.address_line2,
      city: body.city,
      state: body.state,
      pincode: body.pincode,
      business_type: body.business_type,
      annual_turnover: body.annual_turnover,
      status: 'APPLICATION_SUBMITTED',
    })
    .select()
    .single();

  if (profileError) {
    await authRepo.deleteAuthUser(authUser.id);
    throw Err.fromSupabase(profileError);
  }

  // Create initial customer_application
  const { error: appError } = await adminClient
    .from('customer_applications')
    .insert({ customer_id: authUser.id, status: 'PENDING_CRE_REVIEW', notes: body.notes });
  if (appError) throw Err.fromSupabase(appError);

  return profile;
}

/** List all applications (for CRE/CEO/AE) */
export async function listApplications(db, query) {
  const { data, count } = await customersRepo.findAllApplications(db, query);
  return {
    applications: data,
    pagination: buildPaginationMeta({ page: query.page, limit: query.limit, total: count }),
  };
}

export async function getApplication(db, id) {
  const app = await customersRepo.findApplicationById(db, id);
  if (!app) throw Err.notFound('Application');
  return app;
}

export async function reviewApplication(db, applicationId, body, actorId) {
  const app = await customersRepo.findApplicationById(db, applicationId);
  if (!app) throw Err.notFound('Application');

  const updated = await customersRepo.updateApplication(db, applicationId, {
    status:      body.status,
    notes:       body.notes,
    reviewed_by: actorId,
    reviewed_at: new Date().toISOString(),
  });

  // Sync customer_profiles.status
  const statusMap = {
    PENDING_CRE_REVIEW:      'PENDING_CRE_REVIEW',
    ACTION_REQUIRED:         'ACTION_REQUIRED',
    PENDING_ACCOUNTS_REVIEW: 'PENDING_ACCOUNTS_REVIEW',
    CREDIT_SETUP_IN_PROGRESS:'CREDIT_SETUP_IN_PROGRESS',
    APPROVED:                'APPROVED',
    REJECTED:                'REJECTED',
  };
  if (statusMap[body.status]) {
    await customersRepo.update(db, app.customer_id, { status: statusMap[body.status] });
  }

  return updated;
}

/**
 * Upload a customer document to Supabase Storage (private bucket).
 * Returns a short-lived signed URL — never a permanent public URL.
 */
export async function uploadDocument(db, customerId, applicationId, file, uploaderId) {
  const safeFilename = sanitizeFilename(file.originalname);
  const storagePath = `${customerId}/${Date.now()}_${safeFilename}`;

  const { error: uploadError } = await adminClient.storage
    .from(env.SUPABASE_STORAGE_BUCKET_DOCS)
    .upload(storagePath, file.buffer, { contentType: file.mimetype });
  if (uploadError) throw Err.internal('File upload failed');

  // Store the storage path, not a URL — generate signed URLs on demand
  return customersRepo.insertDocument(db, {
    customer_id:     customerId,
    application_id:  applicationId,
    uploaded_by:     uploaderId,
    storage_path:    storagePath,
    file_name:       safeFilename,
    file_mime_type:  file.mimetype,
    document_type:   'OTHER',
  });
}

export async function getDocuments(db, customerId) {
  const docs = await customersRepo.findDocuments(db, customerId);
  // Attach a fresh signed URL to each document record
  return Promise.all(
    docs.map(async (doc) => ({
      ...doc,
      signed_url: doc.storage_path
        ? await getSignedUrl(env.SUPABASE_STORAGE_BUCKET_DOCS, doc.storage_path)
        : null,
    })),
  );
}
