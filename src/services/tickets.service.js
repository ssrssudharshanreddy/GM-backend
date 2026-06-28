import * as repo from '../repositories/tickets.repository.js';
import { dispatch, dispatchToRole } from '../repositories/notifications.repository.js';
import { Err } from '../utils/errors.js';
import { buildPaginationMeta } from '../utils/pagination.js';

export async function listTickets(db, query) {
  const { data, count } = await repo.findAll(db, query);
  return { tickets: data, pagination: buildPaginationMeta({ page: query.page, limit: query.limit, total: count }) };
}

export async function getTicket(db, id) {
  const t = await repo.findById(db, id);
  if (!t) throw Err.notFound('Ticket');
  return t;
}

export async function createTicket(db, body, customerId) {
  const ticket = await repo.create(db, {
    customer_id: customerId,
    category:    body.category,
    subject:     body.subject,
    status:      'OPEN',
  });
  
  dispatchToRole('CREM', {
    type: 'TICKET_UPDATE',
    title: 'New Support Ticket',
    body: `A new ticket has been opened: ${body.subject}`,
    entity_type: 'ticket',
    entity_id: ticket.id,
    action_url: `/crem/tickets/${ticket.id}`
  });
  
  return ticket;
}

export async function updateTicket(db, id, body, actorId) {
  const ticket = await repo.findById(db, id);
  if (!ticket) throw Err.notFound('Ticket');
  return repo.update(db, id, body);
}

export async function addMessage(db, ticketId, body, senderId) {
  const ticket = await repo.findById(db, ticketId);
  if (!ticket) throw Err.notFound('Ticket');
  if (['RESOLVED', 'CLOSED'].includes(ticket.status) && !body.is_internal_note) {
    throw Err.unprocessable('Cannot add messages to a resolved or closed ticket');
  }
  
  const msg = await repo.addMessage(db, {
    ticket_id:        ticketId,
    sender_id:        senderId,
    message:          body.message,
    is_internal_note: body.is_internal_note ?? false,
  });
  
  // If the sender is NOT the customer, notify the customer (and it's not internal)
  if (senderId !== ticket.customer_id && !body.is_internal_note) {
    dispatch({
      recipient_id: ticket.customer_id,
      recipient_role: 'CUSTOMER',
      type: 'TICKET_UPDATE',
      title: 'New Ticket Reply',
      body: `You have a new reply on your ticket: ${ticket.subject}`,
      entity_type: 'ticket',
      entity_id: ticket.id,
      action_url: `/tickets/${ticket.id}`
    });
  } else if (senderId === ticket.customer_id) {
    // If the customer sent it, notify the assigned CREM or all CREMs
    if (ticket.assigned_crem_id) {
      dispatch({
        recipient_id: ticket.assigned_crem_id,
        recipient_role: 'CREM',
        type: 'TICKET_UPDATE',
        title: 'New Ticket Reply',
        body: `Customer replied to ticket: ${ticket.subject}`,
        entity_type: 'ticket',
        entity_id: ticket.id,
        action_url: `/crem/tickets/${ticket.id}`
      });
    } else {
      dispatchToRole('CREM', {
        type: 'TICKET_UPDATE',
        title: 'New Ticket Reply',
        body: `Customer replied to unassigned ticket: ${ticket.subject}`,
        entity_type: 'ticket',
        entity_id: ticket.id,
        action_url: `/crem/tickets/${ticket.id}`
      });
    }
  }
  
  return msg;
}

export async function closeTicket(db, id) {
  return repo.update(db, id, { status: 'CLOSED' });
}
