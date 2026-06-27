import * as repo from '../repositories/products.repository.js';
import * as inventoryRepo from '../repositories/inventory.repository.js';
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

/**
 * Auto-generate a product code: PRD-XXXXX (5 uppercase alphanumeric chars)
 * Retries until unique (collision-safe for up to ~3M products).
 */
async function generateProductCode(db) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  for (let attempt = 0; attempt < 10; attempt++) {
    const suffix = Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const code = `PRD-${suffix}`;
    const { data } = await db.from('products').select('id').eq('product_code', code).maybeSingle();
    if (!data) return code; // unique
  }
  throw new Error('Could not generate a unique product code. Please try again.');
}

export async function create(db, body) {
  const { initial_quantity, reorder_threshold, ...productData } = body;

  // Auto-generate product code if not provided
  if (!productData.product_code) {
    productData.product_code = await generateProductCode(db);
  }

  const product = await repo.create(db, productData);

  // Seed initial inventory if quantity or threshold provided
  if ((initial_quantity && Number(initial_quantity) > 0) || reorder_threshold !== undefined) {
    try {
      await inventoryRepo.upsert(db, product.id, Number(initial_quantity) || 0, {
        adjustment_type: 'INITIAL_STOCK',
        reason: 'Initial stock on product creation',
        reorder_threshold: reorder_threshold !== undefined ? Number(reorder_threshold) : undefined,
      }, null);
    } catch {
      // Non-fatal: inventory can be set later via Inventory module
    }
  }

  return product;
}

export async function update(db, id, body) {
  const p = await repo.findById(db, id);
  if (!p) throw Err.notFound('Product');
  return repo.update(db, id, body);
}
