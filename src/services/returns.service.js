import * as repo from '../repositories/returns.repository.js';
import * as ordersRepo from '../repositories/orders.repository.js';
import * as returnPinsRepo from '../repositories/returnPins.repository.js';
import { adminClient } from '../config/supabase.js';
import { env } from '../config/env.js';
import { Err } from '../utils/errors.js';
import { buildPaginationMeta } from '../utils/pagination.js';
import { dispatch, dispatchToRole } from '../repositories/notifications.repository.js';

export async function listReturns(db, query) {
  const { data, count } = await repo.findAll(db, query);
  return { returns: data, pagination: buildPaginationMeta({ page: query.page, limit: query.limit, total: count }) };
}

export async function getReturn(db, id) {
  const r = await repo.findById(db, id);
  if (!r) throw Err.notFound('Return');
  return r;
}

export async function createReturn(db, payload, customerId) {
  // Use a transaction since we insert into returns and return_items
  const { data: ret, error } = await db.rpc('create_return', {
    p_customer_id: customerId,
    p_order_id: payload.order_id,
    p_return_type: payload.return_type,
    p_notes: payload.notes,
    p_items: payload.items
  });
  if (error) throw Err.fromSupabase(error);
  
  const { data: customer } = await db.from('customer_profiles').select('assigned_crem_id').eq('id', customerId).single();

  const notifyPayload = (role) => ({
    type: 'RETURN_UPDATE',
    title: 'New Return Request',
    body: `A new return request has been submitted.`,
    entity_type: 'return',
    entity_id: ret.id,
    action_url: `/${role.toLowerCase()}/returns/${ret.id}`
  });

  await dispatchToRole('WE', notifyPayload('WE'));
  await dispatchToRole('CEO', notifyPayload('CEO'));
  await dispatchToRole('CRE', notifyPayload('CRE'));

  if (customer?.assigned_crem_id) {
    await dispatch({
      recipient_id: customer.assigned_crem_id,
      recipient_role: 'CREM',
      type: 'RETURN_UPDATE',
      title: 'New Return Request from Assigned Customer',
      body: `One of your assigned customers has submitted a return request.`,
      entity_type: 'return',
      entity_id: ret.id,
      action_url: `/crem/returns/${ret.id}`
    });
  }

  return ret;
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

  let updated;
  if (body.status === 'RETURN_COMPLETED') {
    // Generate a credit note number like CN-{Random5}
    const cnNumber = `CN-${Math.floor(10000 + Math.random() * 90000)}`;
    const { data: rpcData, error: rpcErr } = await db.rpc('process_return_refund', {
      p_return_id: id,
      p_credit_note_number: cnNumber
    });
    if (rpcErr) throw Err.fromSupabase(rpcErr);
    
    // After RPC, fetch the updated return to return to client
    updated = await repo.findById(db, id);
  } else {
    updated = await repo.updateStatus(db, id, updatePayload);
  }

  if (body.status && body.status !== ret.status) {
    if (['RETURN_APPROVED', 'RETURN_REJECTED', 'PICKUP_SCHEDULED', 'RETURN_COMPLETED'].includes(body.status)) {
      dispatch({
        recipient_id: ret.customer_id,
        recipient_role: 'CUSTOMER',
        type: 'RETURN_UPDATE',
        title: `Return ${body.status.replace('RETURN_', '')}`,
        body: `Your return request has been updated to ${body.status.replace(/_/g, ' ')}.`,
        entity_type: 'return',
        entity_id: id,
        action_url: `/returns/${id}`
      });
    }
  }

  if (body.assigned_ws_id && body.assigned_ws_id !== ret.assigned_ws_id) {
    dispatch({
      recipient_id: body.assigned_ws_id,
      recipient_role: 'WS',
      type: 'RETURN_UPDATE',
      title: 'New Return Assigned',
      body: `You have been assigned to pick up a return.`,
      entity_type: 'return',
      entity_id: id,
      action_url: `/ws/returns/${id}`
    });
  }

  return updated;
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
  
  dispatch({
    recipient_id: ret.customer_id,
    recipient_role: 'CUSTOMER',
    type: 'RETURN_UPDATE',
    title: 'Return Collected',
    body: `Your return has been successfully collected.`,
    entity_type: 'return',
    entity_id: returnId,
    action_url: `/returns/${returnId}`
  });

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
