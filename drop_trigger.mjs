import pg from 'pg';
const {Client} = pg;
const client = new Client({connectionString: 'postgresql://postgres.lrrjkdxntsdnmbtntepx:GangaMaxx@18@aws-1-ap-south-1.pooler.supabase.com:5432/postgres'});
await client.connect();
await client.query(`
DROP TRIGGER IF EXISTS trg_order_credit_check ON public.orders;
`);
console.log('Dropped trg_order_credit_check');
await client.end();
