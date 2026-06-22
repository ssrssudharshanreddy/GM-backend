import * as service from '../services/invoices.service.js';
import { sendSuccess } from '../utils/response.js';

export async function list(req, res) {
  const result = await service.listInvoices(req.db, req.query);
  sendSuccess(res, result.invoices, 200, { pagination: result.pagination });
}
export async function getById(req, res) {
  sendSuccess(res, await service.getInvoice(req.db, req.params.id));
}
export async function listOverdue(req, res) {
  const result = await service.listOverdue(req.db, req.query);
  sendSuccess(res, result.invoices, 200, { pagination: result.pagination });
}
