import * as repo from '../repositories/orders.repository.js';
import { Err } from '../utils/errors.js';
import { buildPaginationMeta } from '../utils/pagination.js';

export async function listOrders(db, query) {
  const { data, count } = await repo.findAll(db, query);
  return { orders: data, pagination: buildPaginationMeta({ page: query.page, limit: query.limit, total: count }) };
}

export async function getOrder(db, id) {
  const order = await repo.findById(db, id);
  if (!order) throw Err.notFound('Order');
  return order;
}

export async function placeOrder(db, body, customerId) {
  return repo.create(db, {
    p_customer_id:         customerId,
    p_delivery_address:    body.delivery_address,
    p_items:               body.items,
    p_special_instructions: body.special_instructions ?? null,
  });
}

export async function updateOrderStatus(db, id, body, actorId, actorRole) {
  const order = await repo.findById(db, id);
  if (!order) throw Err.notFound('Order');

  const updatePayload = {};

  if (body.status && body.status !== order.status) {
    const ALLOWED_TRANSITIONS = {
      PENDING:     ['CONFIRMED', 'CANCELLED'],
      CONFIRMED:   ['PROCESSING', 'STOCK_HOLD', 'CANCELLED'],
      PROCESSING:  ['PACKED', 'STOCK_HOLD', 'CANCELLED'],
      PACKED:      ['DISPATCHED'],
      DISPATCHED:  ['DELIVERED'],
      STOCK_HOLD:  ['PROCESSING', 'CANCELLED'],
    };

    const allowed = ALLOWED_TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(body.status)) {
      throw Err.unprocessable(`Cannot transition from ${order.status} to ${body.status}`);
    }
    updatePayload.status = body.status;
  }
  if (body.assigned_we_id)     updatePayload.assigned_we_id = body.assigned_we_id;
  if (body.assigned_ws_id)     updatePayload.assigned_ws_id = body.assigned_ws_id;
  if (body.cancellation_reason) updatePayload.cancellation_reason = body.cancellation_reason;
  if (body.stock_hold_reason)   updatePayload.stock_hold_reason = body.stock_hold_reason;

  return repo.updateStatus(db, id, updatePayload);
}
