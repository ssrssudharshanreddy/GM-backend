import pg from 'pg';
import fs from 'fs/promises';

const client = new pg.Client({connectionString: 'postgresql://postgres.lrrjkdxntsdnmbtntepx:GangaMaxx@18@aws-1-ap-south-1.pooler.supabase.com:5432/postgres'});
await client.connect();

try {
  const sql = await fs.readFile('../database/patches/returns_proof_urls.sql', 'utf8');
  await client.query(sql);
  console.log('Successfully added proof_urls column.');
} catch (e) {
  console.error('Failed to add column:', e);
} finally {
  await client.end();
}
