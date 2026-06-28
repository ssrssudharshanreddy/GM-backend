import pg from 'pg';
import fs from 'fs/promises';

const client = new pg.Client({connectionString: 'postgresql://postgres.lrrjkdxntsdnmbtntepx:GangaMaxx@18@aws-1-ap-south-1.pooler.supabase.com:5432/postgres'});
await client.connect();

try {
  const sql = await fs.readFile('../database/patches/verify_payment.sql', 'utf8');
  await client.query(sql);
  console.log('Successfully created verify_payment function.');
} catch (e) {
  console.error('Failed to create function:', e);
} finally {
  await client.end();
}
