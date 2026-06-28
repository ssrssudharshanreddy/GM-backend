import pg from 'pg';
const {Client} = pg;
const client = new Client({connectionString: 'postgresql://postgres.lrrjkdxntsdnmbtntepx:GangaMaxx@18@aws-1-ap-south-1.pooler.supabase.com:5432/postgres'});
await client.connect();
const res = await client.query("SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'trg_fn_order_placed_credit_check';");
console.log(res.rows[0]?.pg_get_functiondef);
await client.end();
