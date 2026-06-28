import * as customersRepo from '../repositories/customers.repository.js';
import * as authRepo from '../repositories/auth.repository.js';
import * as creditAccountsRepo from '../repositories/creditAccounts.repository.js';
import { adminClient } from '../config/supabase.js';
import { env } from '../config/env.js';
import { Err } from '../utils/errors.js';
import { buildPaginationMeta } from '../utils/pagination.js';
import path from 'path';

/** Strip path traversal characters from a user-supplied filename */
function sanitizeFilename(name) {
  return path.basename(name).replace(/[^a-zA-Z0-9._\-]/g, '_');
}

async function getSignedUrl(bucket, storagePath) {
  try {
    const { data, error } = await adminClient.storage
      .from(bucket)
      .createSignedUrl(storagePath, 3600);
    if (error) {
      console.error(`getSignedUrl error for bucket '${bucket}' path '${storagePath}':`, error.message || error);
      return null;
    }
    return data?.signedUrl || null;
  } catch (err) {
    console.error(`getSignedUrl exception for path '${storagePath}':`, err.message || err);
    return null;
  }
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
export async function selfRegister(body, files = {}) {
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
  const { data: appData, error: appError } = await adminClient
    .from('customer_applications')
    .insert({ customer_id: authUser.id, status: 'PENDING_CRE_REVIEW', notes: body.notes })
    .select()
    .single();

  if (appError) {
    await authRepo.deleteAuthUser(authUser.id);
    throw Err.fromSupabase(appError);
  }

  const applicationId = appData.id;

  // Process document uploads
  if (files) {
    const docTypes = {
      gst_certificate: 'GST_CERTIFICATE',
      business_registration: 'REGISTRATION_DOC',
      address_proof: 'ADDRESS_PROOF',
    };
    for (const [key, docType] of Object.entries(docTypes)) {
      const fileArray = files[key];
      const file = fileArray && fileArray[0];
      if (file) {
        const safeFilename = sanitizeFilename(file.originalname);
        const storagePath = `${authUser.id}/${Date.now()}_${safeFilename}`;
        
        // Upload to Supabase Storage
        const { error: uploadError } = await adminClient.storage
          .from(env.SUPABASE_STORAGE_BUCKET_DOCS)
          .upload(storagePath, file.buffer, { contentType: file.mimetype });
          
        if (uploadError) {
          console.error(`Upload failed for ${key}:`, uploadError);
          if (key === 'gst_certificate') {
            await authRepo.deleteAuthUser(authUser.id);
            throw Err.internal('GST Certificate upload failed');
          }
          continue;
        }
        
        // Insert into customer_documents
        const { error: docError } = await adminClient
          .from('customer_documents')
          .insert({
            customer_id: authUser.id,
            application_id: applicationId,
            document_type: docType,
            file_name: safeFilename,
            file_url: storagePath,
            file_size_bytes: file.size,
            file_mime_type: file.mimetype,
            status: 'PENDING_REVIEW',
          });
        if (docError) {
          console.error(`Database insertion failed for ${key}:`, docError);
        }
      }
    }
  }

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

  // Attach signed URLs to embedded documents
  if (Array.isArray(app.customer_documents) && app.customer_documents.length > 0) {
    app.documents = await Promise.all(
      app.customer_documents.map(async (doc) => {
        const signedUrl = doc.file_url
          ? await getSignedUrl(env.SUPABASE_STORAGE_BUCKET_DOCS, doc.file_url)
          : null;
        return { ...doc, file_url: signedUrl, signed_url: signedUrl };
      }),
    );
  } else {
    app.documents = app.customer_documents || [];
  }
  delete app.customer_documents;

  return app;
}

export async function reviewApplication(db, applicationId, body, actorId) {
  const app = await customersRepo.findApplicationById(db, applicationId);
  if (!app) throw Err.notFound('Application');

  const payload = { status: body.status };
  
  if (app.status === 'PENDING_CRE_REVIEW' || app.status === 'ACTION_REQUIRED') {
    payload.cre_reviewed_by = actorId;
    payload.cre_reviewed_at = new Date().toISOString();
    if (body.notes) payload.cre_notes = body.notes;
    if (body.status === 'REJECTED') payload.rejection_reason = body.notes;
  } else if (app.status === 'PENDING_ACCOUNTS_REVIEW') {
    payload.ae_reviewed_by = actorId;
    payload.ae_reviewed_at = new Date().toISOString();
    if (body.notes) payload.ae_notes = body.notes;
    if (body.status === 'REJECTED') payload.rejection_reason = body.notes;
  }

  const updated = await customersRepo.updateApplication(db, applicationId, payload);

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
 * AE: Approve application and create credit account in one step.
 */
export async function setupCredit(db, applicationId, body, actorId) {
  const app = await customersRepo.findApplicationById(db, applicationId);
  if (!app) throw Err.notFound('Application');
  if (app.status !== 'PENDING_ACCOUNTS_REVIEW') {
    throw Err.badRequest('Application is not in PENDING_ACCOUNTS_REVIEW status');
  }

  // 1. Create credit account
  const existing = await creditAccountsRepo.findByCustomer(db, app.customer_id);
  if (!existing) {
    await creditAccountsRepo.create(db, {
      customer_id:  app.customer_id,
      credit_limit: body.credit_limit,
      credit_days:  body.credit_days,
      created_by:   actorId,
    });
  }

  // 2. Mark application as APPROVED
  const updated = await customersRepo.updateApplication(db, applicationId, {
    status:         'APPROVED',
    ae_reviewed_by: actorId,
    ae_reviewed_at: new Date().toISOString(),
    ae_notes:       body.notes || null,
    activated_by:   actorId,
    activated_at:   new Date().toISOString(),
  });

  // 3. Sync customer status to ACTIVE
  await customersRepo.update(db, app.customer_id, { status: 'ACTIVE' });

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
    requested_by:    uploaderId,
    file_url:        storagePath,
    file_name:       safeFilename,
    file_mime_type:  file.mimetype,
    file_size_bytes: file.size,
    document_type:   'OTHER',
    status:          'PENDING_REVIEW',
  });
}

export async function getDocuments(db, customerId) {
  const docs = await customersRepo.findDocuments(db, customerId);
  // Attach a fresh signed URL to each document record
  return Promise.all(
    docs.map(async (doc) => {
      const signedUrl = doc.file_url
        ? await getSignedUrl(env.SUPABASE_STORAGE_BUCKET_DOCS, doc.file_url)
        : null;
      return {
        ...doc,
        file_url: signedUrl,
        signed_url: signedUrl,
      };
    }),
  );
}
