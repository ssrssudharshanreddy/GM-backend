import 'dotenv/config';
import { adminClient } from './src/config/supabase.js';
import sharp from 'sharp';
import path from 'path';

// Simulate what uploadProductImages now does
async function compressImage(buffer) {
  return sharp(buffer)
    .rotate()
    .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer();
}

// Create a 2000×1500 test JPEG (~simulates a phone photo, before compression)
const testImageBuffer = await sharp({
  create: { width: 2000, height: 1500, channels: 3, background: { r: 80, g: 160, b: 240 } }
}).jpeg({ quality: 90 }).toBuffer();

console.log(`Original "photo" size: ${(testImageBuffer.length / 1024).toFixed(1)} KB`);

const compressed = await compressImage(testImageBuffer);
console.log(`Compressed WebP size:  ${(compressed.length / 1024).toFixed(1)} KB`);

const productId = 'daf413cf-7a16-45f5-bc78-3286009bb42f';
const storagePath = `${productId}/${Date.now()}_test_compress.webp`;

const { data, error } = await adminClient.storage
  .from('product-images')
  .upload(storagePath, compressed, { contentType: 'image/webp', upsert: true });

if (error) {
  console.error('Upload FAILED:', error.message);
} else {
  const { data: urlData } = adminClient.storage.from('product-images').getPublicUrl(storagePath);
  console.log('Upload SUCCESS ✅');
  console.log('Public URL:', urlData.publicUrl);

  // Save URL to product images array
  const { data: existing } = await adminClient.from('products').select('images').eq('id', productId).single();
  const images = [...(existing?.images || []), urlData.publicUrl];
  const { error: updateErr } = await adminClient.from('products').update({ images }).eq('id', productId);
  console.log('Saved to DB:', updateErr ? updateErr.message : '✅');

  // Verify
  const { data: product } = await adminClient.from('products').select('images').eq('id', productId).single();
  console.log('Product images in DB:', product?.images);
}
