import * as repo from '../repositories/inventory.repository.js';
import { Err } from '../utils/errors.js';
import { buildPaginationMeta } from '../utils/pagination.js';

export async function listInventory(db, query) {
  const { data, count } = await repo.findAll(db, query);
  return { inventory: data, pagination: buildPaginationMeta({ page: query.page, limit: query.limit, total: count }) };
}

export async function getByProduct(db, productId) {
  const inv = await repo.findByProduct(db, productId);
  if (!inv) throw Err.notFound('Inventory record');
  return inv;
}

export async function adjustInventory(db, body, performedBy) {
  return repo.upsert(db, body.product_id, body.quantity_change, body, performedBy);
}

export async function updateThreshold(db, productId, threshold) {
  return repo.updateThreshold(db, productId, threshold);
}

export async function listMovements(db, query) {
  const { data, count } = await repo.findMovements(db, query);
  return { movements: data, pagination: buildPaginationMeta({ page: query.page, limit: query.limit, total: count }) };
}

export async function getLowStock(db) {
  return repo.findLowStock(db);
}
