import * as repo from '../repositories/categories.repository.js';
import { Err } from '../utils/errors.js';
import { buildPaginationMeta } from '../utils/pagination.js';

export async function list(db, query) {
  const { data, count } = await repo.findAll(db, query);
  return { categories: data, pagination: buildPaginationMeta({ page: query.page, limit: query.limit, total: count }) };
}

export async function getById(db, id) {
  const cat = await repo.findById(db, id);
  if (!cat) throw Err.notFound('Category');
  return cat;
}

export async function create(db, body) {
  return repo.create(db, body);
}

export async function update(db, id, body) {
  const cat = await repo.findById(db, id);
  if (!cat) throw Err.notFound('Category');
  return repo.update(db, id, body);
}

export async function remove(db, id) {
  const cat = await repo.findById(db, id);
  if (!cat) throw Err.notFound('Category');
  return repo.remove(db, id);
}
