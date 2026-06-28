import pg from 'pg';
const client = new pg.Client({connectionString: 'postgresql://postgres.lrrjkdxntsdnmbtntepx:GangaMaxx@18@aws-1-ap-south-1.pooler.supabase.com:5432/postgres'});
await client.connect();
const res = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'delivery_pins';`);
console.log(res.rows.map(r=>r.column_name));
await client.end();
