import * as repo from '../repositories/returns.repository.js';
import * as ordersRepo from '../repositories/orders.repository.js';
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
    REQUESTED:             ['UNDER_REVIEW', 'RETURN_REJECTED'],
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
