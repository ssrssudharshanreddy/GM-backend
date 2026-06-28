import * as repo from '../repositories/returns.repository.js';
import * as ordersRepo from '../repositories/orders.repository.js';
import * as returnPinsRepo from '../repositories/returnPins.repository.js';
import { adminClient } from '../config/supabase.js';
import { env } from '../config/env.js';
import { Err } from '../utils/errors.js';
import { buildPaginationMeta } from '../utils/pagination.js';

export async function listReturns(db, query) {
  const { data, count } = await repo.findAll(db, query);
  return { returns: data, pagination: buildPaginationMeta({ page: query.page, limit: query.limit, total: count }) };
}

export async function getReturn(db, id) {
  const r = await repo.findById(db, id);
  if (!r) throw Err.notFound('Return');
  return r;
}

export async function createReturn(db, body, customerId) {
  // Confirm the order exists and belongs to this customer.
  // RLS also enforces this at the DB layer; we validate here for a clear error message.
  const order = await ordersRepo.findById(db, body.order_id);
  if (!order) throw Err.notFound('Order');
  if (order.customer_id !== customerId) {
    throw Err.forbidden('You can only request returns for your own orders');
  }

  return repo.create(db, {
    p_customer_id: customerId,
    p_order_id:    body.order_id,
    p_return_type: body.return_type,
    p_items:       body.items,
    p_notes:       body.notes ?? null,
  });
}

export async function updateReturnStatus(db, id, body, actorId, actorRole) {
  const ret = await repo.findById(db, id);
  if (!ret) throw Err.notFound('Return');

  const ALLOWED_TRANSITIONS = {
    RETURN_REQUESTED:      ['UNDER_REVIEW', 'RETURN_REJECTED'],
    UNDER_REVIEW:          ['RETURN_APPROVED', 'RETURN_REJECTED'],
    RETURN_APPROVED:       ['PICKUP_SCHEDULED'],
    // PICKUP_SCHEDULED → itself is allowed for rescheduling (date change only)
    PICKUP_SCHEDULED:      ['OUT_FOR_PICKUP', 'PICKUP_SCHEDULED'],
    OUT_FOR_PICKUP:        ['COLLECTED'],
    COLLECTED:             ['RETURNED_TO_WAREHOUSE'],
    RETURNED_TO_WAREHOUSE: ['RETURN_COMPLETED'],
  };

  const allowed = ALLOWED_TRANSITIONS[ret.status] ?? [];

  // Only CEO may perform out-of-band transitions; this is enforced by role, not a client flag
  if (!allowed.includes(body.status) && actorRole !== 'CEO') {
    throw Err.unprocessable(`Cannot transition from ${ret.status} to ${body.status}`);
  }

  const updatePayload = { status: body.status };
  if (body.pickup_scheduled_date) updatePayload.pickup_scheduled_date = body.pickup_scheduled_date;
  if (body.assigned_ws_id)        updatePayload.assigned_ws_id = body.assigned_ws_id;
  if (body.rejection_reason)      updatePayload.rejection_reason = body.rejection_reason;

  return repo.updateStatus(db, id, updatePayload);
}

export async function updateItemOutcomes(db, returnId, body) {
  await getReturn(db, returnId); // ensure exists
  return repo.updateItemOutcomes(db, body.items);
}

export async function collectReturn(db, returnId, body, wsId) {
  const ret = await getReturn(db, returnId);
  if (ret.status !== 'PICKUP_SCHEDULED' && ret.status !== 'OUT_FOR_PICKUP') {
    throw Err.unprocessable(`Return is not in a collectible state (current: ${ret.status})`);
  }
  
  // Verify PIN
  await returnPinsRepo.verify(db, returnId, body.pin, wsId, body.latitude, body.longitude);
  
  // Update status to COLLECTED
  return repo.updateStatus(db, returnId, { status: 'COLLECTED' });
}

export async function uploadCustomerProofs(db, returnId, files) {
  const ret = await getReturn(db, returnId); // ensure it exists
  const urls = [];
  
  for (const file of files) {
    const path = `returns/${returnId}/${Date.now()}_${file.originalname}`;
    const { error: uploadError } = await adminClient.storage
      .from(env.SUPABASE_STORAGE_BUCKET_RETURN)
      .upload(path, file.buffer, { contentType: file.mimetype });
      
    if (uploadError) throw Err.internal('File upload failed');
    
    const { data: { publicUrl } } = adminClient.storage
      .from(env.SUPABASE_STORAGE_BUCKET_RETURN)
      .getPublicUrl(path);
      
    await repo.addProofUrl(db, returnId, publicUrl);
    urls.push(publicUrl);
  }
  
  return { urls };
}
