import pg from 'pg';
const client = new pg.Client({connectionString: 'postgresql://postgres.lrrjkdxntsdnmbtntepx:GangaMaxx@18@aws-1-ap-south-1.pooler.supabase.com:5432/postgres'});
await client.connect();
const res = await client.query(`SELECT tgname FROM pg_trigger;`);
console.log(res.rows.map(r=>r.tgname).filter(n=>n.includes('pin') || n.includes('delivery') || n.includes('order')));
await client.end();
