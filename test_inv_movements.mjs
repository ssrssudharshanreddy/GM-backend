import pg from 'pg';
const {Client} = pg;
const client = new Client({connectionString: 'postgresql://postgres.lrrjkdxntsdnmbtntepx:GangaMaxx@18@aws-1-ap-south-1.pooler.supabase.com:5432/postgres'});
await client.connect();
const res = await client.query(`
SELECT column_name, column_default 
FROM information_schema.columns 
WHERE table_name = 'inventory_movements' AND column_name = 'performed_by';
`);
console.log(res.rows);
const res2 = await client.query(`
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'inventory_movements'::regclass;
`);
console.log(res2.rows);
await client.end();
