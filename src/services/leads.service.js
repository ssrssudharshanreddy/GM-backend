import * as repo from '../repositories/leads.repository.js';
import { Err } from '../utils/errors.js';
import { buildPaginationMeta } from '../utils/pagination.js';

export async function listLeads(db, query) {
  const { data, count } = await repo.findAll(db, query);
  return { leads: data, pagination: buildPaginationMeta({ page: query.page, limit: query.limit, total: count }) };
}

export async function getLead(db, id) {
  const l = await repo.findById(db, id);
  if (!l) throw Err.notFound('Lead');
  return l;
}

export async function createLead(db, body, actorId) {
  return repo.create(db, { ...body, assigned_crem_id: actorId, status: 'NEW' });
}

export async function updateLead(db, id, body) {
  const l = await repo.findById(db, id);
  if (!l) throw Err.notFound('Lead');
  if (body.status === 'CONVERTED' && !body.converted_customer_id) {
    throw Err.badRequest('converted_customer_id is required when marking lead as CONVERTED');
  }
  return repo.update(db, id, body);
}
