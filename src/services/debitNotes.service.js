import * as repo from '../repositories/debitNotes.repository.js';
import { Err } from '../utils/errors.js';
import { buildPaginationMeta } from '../utils/pagination.js';

export async function list(db, query) {
  const { data, count } = await repo.findAll(db, query);
  return { debitNotes: data, pagination: buildPaginationMeta({ page: query.page, limit: query.limit, total: count }) };
}
export async function getById(db, id) {
  const dn = await repo.findById(db, id);
  if (!dn) throw Err.notFound('Debit note');
  return dn;
}
export async function create(db, body, actorId) {
  return repo.create(db, { ...body, created_by: actorId });
}
