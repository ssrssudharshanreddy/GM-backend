import pg from 'pg';
const client = new pg.Client({connectionString: 'postgresql://postgres.lrrjkdxntsdnmbtntepx:GangaMaxx@18@aws-1-ap-south-1.pooler.supabase.com:5432/postgres'});
await client.connect();
const res = await client.query(`SELECT proname FROM pg_proc JOIN pg_trigger ON pg_proc.oid = pg_trigger.tgfoid WHERE tgname = 'trg_order_status_effects';`);
console.log(res.rows[0].proname);
const res2 = await client.query(`SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = $1;`, [res.rows[0].proname]);
console.log(res2.rows[0].pg_get_functiondef);
await client.end();
