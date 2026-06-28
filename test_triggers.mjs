import pg from 'pg';
const {Client} = pg;
const client = new Client({connectionString: 'postgresql://postgres.lrrjkdxntsdnmbtntepx:GangaMaxx@18@aws-1-ap-south-1.pooler.supabase.com:5432/postgres'});
await client.connect();
const res = await client.query(`
SELECT tgname, pg_get_triggerdef(oid) 
FROM pg_trigger 
WHERE tgrelid IN ('inventory_movements'::regclass, 'orders'::regclass, 'invoices'::regclass, 'order_items'::regclass)
AND tgisinternal = false;
`);
console.log(res.rows);
await client.end();
