import * as customersService from '../services/customers.service.js';
import { sendSuccess, sendCreated, sendNoContent } from '../utils/response.js';

export async function list(req, res) {
  const result = await customersService.listCustomers(req.db, req.query);
  sendSuccess(res, result.customers, 200, { pagination: result.pagination });
}

export async function getById(req, res) {
  const customer = await customersService.getCustomer(req.db, req.params.id);
  sendSuccess(res, customer);
}

export async function update(req, res) {
  const customer = await customersService.updateCustomer(req.db, req.params.id, req.body);
  sendSuccess(res, customer);
}

export async function assignCrem(req, res) {
  const customer = await customersService.assignCrem(req.db, req.params.id, req.body.crem_id);
  sendSuccess(res, customer);
}

export async function updateStatus(req, res) {
  const customer = await customersService.updateStatus(req.db, req.params.id, req.body.status);
  sendSuccess(res, customer);
}

export async function selfRegister(req, res) {
  const profile = await customersService.selfRegister(req.body);
  sendCreated(res, profile);
}

// Applications
export async function listApplications(req, res) {
  const result = await customersService.listApplications(req.db, req.query);
  sendSuccess(res, result.applications, 200, { pagination: result.pagination });
}

export async function getApplication(req, res) {
  const app = await customersService.getApplication(req.db, req.params.id);
  sendSuccess(res, app);
}

export async function reviewApplication(req, res) {
  const app = await customersService.reviewApplication(req.db, req.params.id, req.body, req.user.id);
  sendSuccess(res, app);
}

// Documents
export async function uploadDocument(req, res) {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No file uploaded' });
  }
  const doc = await customersService.uploadDocument(
    req.db,
    req.params.id,
    req.query.application_id ?? null,
    req.file,
    req.user.id,
  );
  sendCreated(res, doc);
}

export async function getDocuments(req, res) {
  const docs = await customersService.getDocuments(req.db, req.params.id);
  sendSuccess(res, docs);
}
