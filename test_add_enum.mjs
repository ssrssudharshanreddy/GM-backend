import pg from 'pg';
const client = new pg.Client({connectionString: 'postgresql://postgres.lrrjkdxntsdnmbtntepx:GangaMaxx@18@aws-1-ap-south-1.pooler.supabase.com:5432/postgres'});
await client.connect();
try {
  await client.query(`ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'OUT_FOR_DELIVERY' AFTER 'DISPATCHED';`);
  console.log("Enum updated successfully");
} catch (err) {
  console.log("Error:", err);
}
await client.end();
