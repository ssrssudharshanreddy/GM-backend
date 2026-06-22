import * as service from '../services/tickets.service.js';
import { sendSuccess, sendCreated } from '../utils/response.js';

export async function list(req, res) {
  const result = await service.listTickets(req.db, req.query);
  sendSuccess(res, result.tickets, 200, { pagination: result.pagination });
}
export async function getById(req, res) {
  sendSuccess(res, await service.getTicket(req.db, req.params.id));
}
export async function create(req, res) {
  sendCreated(res, await service.createTicket(req.db, req.body, req.user.id));
}
export async function update(req, res) {
  sendSuccess(res, await service.updateTicket(req.db, req.params.id, req.body, req.user.id));
}
export async function addMessage(req, res) {
  sendCreated(res, await service.addMessage(req.db, req.params.id, req.body, req.user.id));
}
export async function close(req, res) {
  sendSuccess(res, await service.closeTicket(req.db, req.params.id));
}
