import pg from 'pg';
const client = new pg.Client({connectionString: 'postgresql://postgres.lrrjkdxntsdnmbtntepx:GangaMaxx@18@aws-1-ap-south-1.pooler.supabase.com:5432/postgres'});
await client.connect();

const plainPin = '123456';
const hash = 'dummyhash';
await client.query(`
  INSERT INTO delivery_pins (order_id, plain_pin, pin_hash, is_active, max_attempts, attempt_count)
  VALUES ('f06336f1-3ed3-41d8-bcae-b6d906a67502', $1, $2, true, 5, 0)
`, [plainPin, hash]);

console.log("Mock pin inserted!");
await client.end();
