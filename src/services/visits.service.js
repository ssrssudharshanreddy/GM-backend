import * as repo from '../repositories/visits.repository.js';
import { Err } from '../utils/errors.js';
import { buildPaginationMeta } from '../utils/pagination.js';

export async function listVisits(db, query) {
  const { data, count } = await repo.findAll(db, query);
  return { visits: data, pagination: buildPaginationMeta({ page: query.page, limit: query.limit, total: count }) };
}

export async function getVisit(db, id) {
  const v = await repo.findById(db, id);
  if (!v) throw Err.notFound('Visit');
  return v;
}

export async function scheduleVisit(db, body, cremId) {
  return repo.create(db, {
    crem_id:     cremId,
    customer_id: body.customer_id ?? null,
    lead_id:     body.lead_id ?? null,
    scheduled_at: body.scheduled_at,
    purpose:     body.purpose,
    notes:       body.notes ?? null,
    status:      'SCHEDULED',
  });
}

export async function completeVisit(db, id, body, cremId) {
  const visit = await repo.findById(db, id);
  if (!visit) throw Err.notFound('Visit');
  if (visit.crem_id !== cremId && !['CEO'].includes(cremId)) {
    // RLS handles ownership; just update
  }
  return repo.update(db, id, {
    status:             body.status,
    actual_at:          body.actual_at,
    outcome:            body.outcome ?? null,
    notes:              body.notes ?? null,
    next_action:        body.next_action ?? null,
    next_followup_date: body.next_followup_date ?? null,
  });
}
