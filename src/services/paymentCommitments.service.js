import * as repo from '../repositories/paymentCommitments.repository.js';
import { Err } from '../utils/errors.js';
import { buildPaginationMeta } from '../utils/pagination.js';

export async function list(db, query) {
  const { data, count } = await repo.findAll(db, query);
  return { commitments: data, pagination: buildPaginationMeta({ page: query.page, limit: query.limit, total: count }) };
}

export async function getById(db, id) {
  const c = await repo.findById(db, id);
  if (!c) throw Err.notFound('Payment commitment');
  return c;
}

export async function create(db, body, actorId) {
  return repo.create(db, { ...body, created_by: actorId, status: 'PENDING' });
}

export async function updateStatus(db, id, status, actorId) {
  const c = await repo.findById(db, id);
  if (!c) throw Err.notFound('Payment commitment');
  return repo.update(db, id, { status, updated_by: actorId });
}
