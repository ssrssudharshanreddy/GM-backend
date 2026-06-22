import * as repo from '../repositories/products.repository.js';
import { Err } from '../utils/errors.js';
import { buildPaginationMeta } from '../utils/pagination.js';

export async function list(db, query) {
  const { data, count } = await repo.findAll(db, query);
  return { products: data, pagination: buildPaginationMeta({ page: query.page, limit: query.limit, total: count }) };
}

export async function getById(db, id) {
  const p = await repo.findById(db, id);
  if (!p) throw Err.notFound('Product');
  return p;
}

export async function create(db, body) {
  return repo.create(db, body);
}

export async function update(db, id, body) {
  const p = await repo.findById(db, id);
  if (!p) throw Err.notFound('Product');
  return repo.update(db, id, body);
}
