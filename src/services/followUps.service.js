import * as repo from '../repositories/followUps.repository.js';
import { Err } from '../utils/errors.js';
import { buildPaginationMeta } from '../utils/pagination.js';

export async function list(db, query) {
  const { data, count } = await repo.findAll(db, query);
  return { followUps: data, pagination: buildPaginationMeta({ page: query.page, limit: query.limit, total: count }) };
}

export async function getById(db, id) {
  const f = await repo.findById(db, id);
  if (!f) throw Err.notFound('Follow-up');
  return f;
}

export async function create(db, body, actorId) {
  return repo.create(db, {
    ...body,
    assigned_to:  actorId,
    is_completed: false,
  });
}

export async function markComplete(db, id, outcome) {
  const f = await repo.findById(db, id);
  if (!f) throw Err.notFound('Follow-up');
  return repo.update(db, id, { is_completed: true, completed_at: new Date().toISOString(), outcome: outcome ?? null });
}

export async function update(db, id, body) {
  return repo.update(db, id, body);
}
