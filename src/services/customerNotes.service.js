import * as repo from '../repositories/customerNotes.repository.js';
import { Err } from '../utils/errors.js';
import { buildPaginationMeta } from '../utils/pagination.js';

export async function listNotes(db, customerId, query) {
  const { data, count } = await repo.findByCustomer(db, customerId, query);
  return { notes: data, pagination: buildPaginationMeta({ page: query.page, limit: query.limit, total: count }) };
}

export async function addNote(db, customerId, body, authorId) {
  return repo.create(db, {
    customer_id:  customerId,
    created_by:   authorId,
    content:      body.content,
    is_sensitive: body.is_sensitive ?? false,
  });
}

export async function deleteNote(db, id) {
  await repo.remove(db, id);
}
