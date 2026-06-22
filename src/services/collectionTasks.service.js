import * as repo from '../repositories/collectionTasks.repository.js';
import { Err } from '../utils/errors.js';
import { buildPaginationMeta } from '../utils/pagination.js';
import { z } from 'zod';

export async function list(db, query) {
  const { data, count } = await repo.findAll(db, query);
  return { tasks: data, pagination: buildPaginationMeta({ page: query.page, limit: query.limit, total: count }) };
}

export async function getById(db, id) {
  const t = await repo.findById(db, id);
  if (!t) throw Err.notFound('Collection task');
  return t;
}

export async function create(db, body, actorId) {
  return repo.create(db, {
    ...body,
    assigned_by: actorId,
    status:      'OPEN',
  });
}

export async function updateStatus(db, id, body) {
  const t = await repo.findById(db, id);
  if (!t) throw Err.notFound('Collection task');
  return repo.update(db, id, {
    status:         body.status,
    outcome_notes:  body.outcome_notes ?? null,
    completed_at:   body.status === 'COMPLETED' ? new Date().toISOString() : null,
  });
}
