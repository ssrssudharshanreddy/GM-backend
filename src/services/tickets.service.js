import * as repo from '../repositories/tickets.repository.js';
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
  return repo.create(db, {
    customer_id: customerId,
    category:    body.category,
    subject:     body.subject,
    status:      'OPEN',
  });
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
  return repo.addMessage(db, {
    ticket_id:        ticketId,
    sender_id:        senderId,
    message:          body.message,
    is_internal_note: body.is_internal_note ?? false,
  });
}

export async function closeTicket(db, id) {
  return repo.update(db, id, { status: 'CLOSED' });
}
