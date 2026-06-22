import * as repo from '../repositories/invoices.repository.js';
import { Err } from '../utils/errors.js';
import { buildPaginationMeta } from '../utils/pagination.js';

export async function listInvoices(db, query) {
  const { data, count } = await repo.findAll(db, query);
  return { invoices: data, pagination: buildPaginationMeta({ page: query.page, limit: query.limit, total: count }) };
}

export async function getInvoice(db, id) {
  const inv = await repo.findById(db, id);
  if (!inv) throw Err.notFound('Invoice');
  return inv;
}

export async function listOverdue(db, query) {
  const { data, count } = await repo.findOverdue(db, query);
  return { invoices: data, pagination: buildPaginationMeta({ page: query.page, limit: query.limit, total: count }) };
}
