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

export async function adjustInventory(db, productId, body, performedBy) {
  const prodId = productId || body.product_id;
  if (!prodId) throw Err.badRequest('Product ID is required');

  let quantityChange = body.quantity_change;
  let payload = {
    adjustment_type: body.adjustment_type || 'MANUAL_ADD',
    reason: body.reason,
    reorder_threshold: body.reorder_threshold
  };

  if (body.type) {
    const current = await repo.findByProduct(db, prodId);
    const currentQty = current ? current.quantity : 0;

    if (body.type === 'add') {
      quantityChange = body.quantity;
      payload.adjustment_type = 'MANUAL_ADD';
    } else if (body.type === 'remove') {
      quantityChange = -body.quantity;
      payload.adjustment_type = 'MANUAL_REMOVE';
    } else if (body.type === 'set') {
      quantityChange = body.quantity - currentQty;
      payload.adjustment_type = quantityChange >= 0 ? 'MANUAL_ADD' : 'MANUAL_REMOVE';
    }
  }

  // Map schema adjustment_type to DB enum values ('ADD', 'REMOVE', 'CORRECTION')
  let dbAdjType = 'ADD';
  if (payload.adjustment_type === 'MANUAL_ADD' || payload.adjustment_type === 'ADD') {
    dbAdjType = 'ADD';
  } else if (payload.adjustment_type === 'MANUAL_REMOVE' || payload.adjustment_type === 'REMOVE' || payload.adjustment_type === 'DAMAGE_WRITE_OFF') {
    dbAdjType = 'REMOVE';
  } else if (payload.adjustment_type === 'INITIAL_STOCK' || payload.adjustment_type === 'CORRECTION') {
    dbAdjType = 'CORRECTION';
  }
  payload.adjustment_type = dbAdjType;

  if (quantityChange === 0) {
    return repo.findByProduct(db, prodId);
  }

  return repo.upsert(db, prodId, quantityChange, payload, performedBy);
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
