import * as repo from '../repositories/orders.repository.js';
import * as pinRepo from '../repositories/deliveryPins.repository.js';
import { dispatch, dispatchToRole } from '../repositories/notifications.repository.js';
import { Err } from '../utils/errors.js';
import { buildPaginationMeta } from '../utils/pagination.js';

export async function listOrders(db, query) {
  const { data, count } = await repo.findAll(db, query);
  return { orders: data, pagination: buildPaginationMeta({ page: query.page, limit: query.limit, total: count }) };
}

export async function getOrder(db, id) {
  const order = await repo.findById(db, id);
  if (!order) throw Err.notFound('Order');
  
  // Attach active delivery pin if one exists (for the customer portal)
  const pinObj = await pinRepo.findActiveByOrder(db, id);
  if (pinObj) {
    order.delivery_pin = pinObj.plain_pin;
  }
  
  return order;
}

export async function placeOrder(db, body, customerId) {
  const order = await repo.create(db, {
    p_customer_id:         customerId,
    p_delivery_address:    body.delivery_address,
    p_items:               body.items,
    p_special_instructions: body.special_instructions ?? null,
  });

  const { data: customer } = await db.from('customer_profiles').select('assigned_crem_id').eq('id', customerId).single();

  const notifyPayload = (role) => ({
    type: 'ORDER_ALERT',
    title: 'New Order Received',
    body: `A new order has been placed by a customer.`,
    entity_type: 'order',
    entity_id: order.id,
    action_url: `/${role.toLowerCase()}/orders/${order.id}`
  });

  await dispatchToRole('CEO', notifyPayload('CEO'));
  await dispatchToRole('CRE', notifyPayload('CRE'));
  await dispatchToRole('WE', notifyPayload('WE'));

  if (customer?.assigned_crem_id) {
    await dispatch({
      recipient_id: customer.assigned_crem_id,
      recipient_role: 'CREM',
      type: 'ORDER_ALERT',
      title: 'New Order from Assigned Customer',
      body: `One of your assigned customers has placed a new order.`,
      entity_type: 'order',
      entity_id: order.id,
      action_url: `/crem/orders/${order.id}`
    });
  }

  return order;
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
      DISPATCHED:  ['OUT_FOR_DELIVERY'],
      OUT_FOR_DELIVERY: ['DELIVERED'],
      STOCK_HOLD:  ['PROCESSING', 'CANCELLED'],
    };

    const allowed = ALLOWED_TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(body.status)) {
      throw Err.unprocessable(`Cannot transition from ${order.status} to ${body.status}`);
    }
    updatePayload.status = body.status;
    
    // Generate the delivery PIN if transitioning to OUT_FOR_DELIVERY
    if (body.status === 'OUT_FOR_DELIVERY') {
      await pinRepo.generate(db, id, actorId);
    }
  }
  if (body.assigned_we_id)     updatePayload.assigned_we_id = body.assigned_we_id;
  if (body.assigned_ws_id)     updatePayload.assigned_ws_id = body.assigned_ws_id;
  if (body.cancellation_reason) updatePayload.cancellation_reason = body.cancellation_reason;
  if (body.stock_hold_reason)   updatePayload.stock_hold_reason = body.stock_hold_reason;

  const updated = await repo.updateStatus(db, id, updatePayload);
  
  if (body.status && body.status !== order.status) {
    if (['CONFIRMED', 'DISPATCHED', 'OUT_FOR_DELIVERY', 'CANCELLED'].includes(body.status)) {
      dispatch({
        recipient_id: order.customer_id,
        recipient_role: 'CUSTOMER',
        type: 'ORDER_UPDATE',
        title: `Order ${body.status}`,
        body: `Your order has been updated to ${body.status.replace(/_/g, ' ')}.`,
        entity_type: 'order',
        entity_id: id,
        action_url: `/orders/${id}`
      });
    }
  }

  // Notify WS if assigned
  if (body.assigned_ws_id && body.assigned_ws_id !== order.assigned_ws_id) {
    dispatch({
      recipient_id: body.assigned_ws_id,
      recipient_role: 'WS',
      type: 'ORDER_UPDATE',
      title: 'New Order Assigned',
      body: `You have been assigned to process a new order.`,
      entity_type: 'order',
      entity_id: id,
      action_url: `/ws/orders/${id}`
    });
  }

  return updated;
}

export async function deliverOrder(db, orderId, pin, wsId, latitude, longitude) {
  const order = await repo.findById(db, orderId);
  if (!order) throw Err.notFound('Order');
  if (order.status !== 'OUT_FOR_DELIVERY') throw Err.unprocessable('Order is not out for delivery');
  
  const result = await pinRepo.verify(db, orderId, pin, wsId, latitude, longitude);
  
  dispatch({
    recipient_id: order.customer_id,
    recipient_role: 'CUSTOMER',
    type: 'ORDER_UPDATE',
    title: 'Order Delivered',
    body: `Your order has been successfully delivered.`,
    entity_type: 'order',
    entity_id: orderId,
    action_url: `/orders/${orderId}`
  });
  
  return result;
}
