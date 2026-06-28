import pg from 'pg';
const {Client} = pg;
const client = new Client({connectionString: 'postgresql://postgres.lrrjkdxntsdnmbtntepx:GangaMaxx@18@aws-1-ap-south-1.pooler.supabase.com:5432/postgres'});
await client.connect();
await client.query(`
DROP POLICY IF EXISTS cp_select ON public.customer_profiles;
CREATE POLICY cp_select ON public.customer_profiles
FOR SELECT
TO public
USING (
  CASE auth_user_role()
    WHEN 'CEO' THEN true
    WHEN 'CRE' THEN true
    WHEN 'AE' THEN true
    WHEN 'WE' THEN true
    WHEN 'WS' THEN true
    WHEN 'CREM' THEN (assigned_crem_id = auth.uid())
    WHEN 'CUSTOMER' THEN (id = auth.uid())
    ELSE false
  END
);
`);
console.log('Updated cp_select policy!');
await client.end();
