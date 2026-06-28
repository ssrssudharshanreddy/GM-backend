import * as repo from '../repositories/products.repository.js';
import * as inventoryRepo from '../repositories/inventory.repository.js';
import { adminClient } from '../config/supabase.js';
import { env } from '../config/env.js';
import { Err } from '../utils/errors.js';
import { buildPaginationMeta } from '../utils/pagination.js';
import path from 'path';
import sharp from 'sharp';

export async function list(db, query) {
  const { data, count } = await repo.findAll(db, query);
  return { products: data, pagination: buildPaginationMeta({ page: query.page, limit: query.limit, total: count }) };
}

export async function getById(db, id) {
  const p = await repo.findById(db, id);
  if (!p) throw Err.notFound('Product');
  return p;
}

/** Strip path traversal characters from a user-supplied filename */
function sanitizeFilename(name) {
  return path.basename(name).replace(/[^a-zA-Z0-9._\-]/g, '_');
}

/**
 * Compress and resize an image buffer using sharp.
 * Returns WebP buffer at max 1200px width, 85% quality.
 */
async function compressImage(buffer, mimetype) {
  try {
    return await sharp(buffer)
      .rotate()                          // Auto-rotate based on EXIF
      .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();
  } catch {
    // If sharp fails (corrupt image etc), return original buffer
    return buffer;
  }
}

/** Upload product images and return public URLs */
async function uploadProductImages(productId, files = []) {
  const urls = [];
  for (const file of files) {
    const safeBasename = sanitizeFilename(file.originalname).replace(/\.[^.]+$/, '') || 'image';
    const storagePath = `${productId}/${Date.now()}_${safeBasename}.webp`;

    // Compress & convert to WebP before uploading
    const compressed = await compressImage(file.buffer, file.mimetype);
    
    const { error: uploadError } = await adminClient.storage
      .from(env.SUPABASE_STORAGE_BUCKET_PRODUCTS)
      .upload(storagePath, compressed, { contentType: 'image/webp', upsert: false });
      
    if (uploadError) {
      console.error('Failed to upload product image:', uploadError.message);
      continue;
    }
    
    const { data } = adminClient.storage
      .from(env.SUPABASE_STORAGE_BUCKET_PRODUCTS)
      .getPublicUrl(storagePath);
      
    if (data?.publicUrl) {
      urls.push(data.publicUrl);
    }
  }
  return urls;
}

/**
 * Auto-generate a product code: PRD-XXXXX (5 uppercase alphanumeric chars)
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

export async function create(db, body, files = []) {
  const { initial_quantity, reorder_threshold, pack_size, ...productData } = body;

  if (!productData.product_code) {
    productData.product_code = await generateProductCode(db);
  }

  // Map pack_size to specifications JSONB
  if (pack_size !== undefined) {
    productData.specifications = { pack_size: Number(pack_size) };
  }

  // Create product to get ID
  let product = await repo.create(db, productData);

  // Upload images
  if (files && files.length > 0) {
    const imageUrls = await uploadProductImages(product.id, files);
    if (imageUrls.length > 0) {
      product = await repo.update(db, product.id, { images: imageUrls });
    }
  }

  // Seed initial inventory — use adminClient to bypass RLS on inventory table
  if ((initial_quantity && Number(initial_quantity) > 0) || (reorder_threshold !== undefined && reorder_threshold !== '')) {
    try {
      await inventoryRepo.upsert(adminClient, product.id, Number(initial_quantity) || 0, {
        adjustment_type: 'ADD',
        reason: 'Initial stock on product creation',
        reorder_threshold: (reorder_threshold !== undefined && reorder_threshold !== '') ? Number(reorder_threshold) : 0,
      }, null);
    } catch (err) {
      console.error('Failed to seed initial inventory:', err);
    }
  }

  return product;
}

export async function update(db, id, body, files = []) {
  const p = await repo.findById(db, id);
  if (!p) throw Err.notFound('Product');

  const { pack_size, deleted_images = [], initial_quantity, reorder_threshold, ...productData } = body;

  if (pack_size !== undefined) {
    productData.specifications = { ...(p.specifications || {}), pack_size: Number(pack_size) };
  }

  let currentImages = Array.isArray(p.images) ? [...p.images] : [];

  // Remove deleted images
  if (deleted_images.length > 0) {
    currentImages = currentImages.filter(img => !deleted_images.includes(img));
    // Optionally: delete from Supabase storage (skipped for brevity, but could be added)
  }

  // Upload new images
  if (files && files.length > 0) {
    const newImageUrls = await uploadProductImages(id, files);
    currentImages = [...currentImages, ...newImageUrls];
  }
  
  productData.images = currentImages;

  const updatedProduct = await repo.update(db, id, productData);

  // Update inventory if quantity adjustment or threshold change provided — use adminClient to bypass RLS
  if ((initial_quantity && Number(initial_quantity) !== 0) || (reorder_threshold !== undefined && reorder_threshold !== '')) {
    try {
      await inventoryRepo.upsert(adminClient, id, Number(initial_quantity) || 0, {
        adjustment_type: Number(initial_quantity) >= 0 ? 'ADD' : 'REMOVE',
        reason: 'Adjusted via product edit',
        reorder_threshold: (reorder_threshold !== undefined && reorder_threshold !== '') ? Number(reorder_threshold) : undefined,
      }, null);
    } catch (err) {
      console.error('Failed to update inventory during product edit', err);
    }
  }

  return updatedProduct;
}
