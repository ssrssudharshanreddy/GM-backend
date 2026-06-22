import * as service from '../services/leads.service.js';
import { sendSuccess, sendCreated } from '../utils/response.js';

export async function list(req, res) {
  const result = await service.listLeads(req.db, req.query);
  sendSuccess(res, result.leads, 200, { pagination: result.pagination });
}
export async function getById(req, res) {
  sendSuccess(res, await service.getLead(req.db, req.params.id));
}
export async function create(req, res) {
  sendCreated(res, await service.createLead(req.db, req.body, req.user.id));
}
export async function update(req, res) {
  sendSuccess(res, await service.updateLead(req.db, req.params.id, req.body));
}
