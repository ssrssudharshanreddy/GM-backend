import * as repo from '../repositories/creditAccounts.repository.js';
import { Err } from '../utils/errors.js';
import { buildPaginationMeta } from '../utils/pagination.js';

export async function list(db, query) {
  const { data, count } = await repo.findAll(db, query);
  return { accounts: data, pagination: buildPaginationMeta({ page: query.page, limit: query.limit, total: count }) };
}

export async function getByCustomer(db, customerId) {
  const a = await repo.findByCustomer(db, customerId);
  if (!a) throw Err.notFound('Credit account');
  return a;
}

export async function create(db, body, actorId) {
  const existing = await repo.findByCustomer(db, body.customer_id);
  if (existing) throw Err.conflict('Credit account already exists for this customer');
  return repo.create(db, { ...body, created_by: actorId });
}

export async function updateLimit(db, customerId, body, actorId) {
  const account = await repo.findByCustomer(db, customerId);
  if (!account) throw Err.notFound('Credit account');
  return repo.update(db, customerId, { ...body, updated_by: actorId });
}

export async function freeze(db, customerId, reason, actorId) {
  return repo.update(db, customerId, { is_frozen: true, freeze_reason: reason, frozen_by: actorId, frozen_at: new Date().toISOString() });
}

export async function unfreeze(db, customerId, actorId) {
  return repo.update(db, customerId, { is_frozen: false, freeze_reason: null });
}

export async function getHistory(db, customerId, query) {
  const { data, count } = await repo.findHistory(db, customerId, query);
  return { history: data, pagination: buildPaginationMeta({ page: query.page, limit: query.limit, total: count }) };
}
