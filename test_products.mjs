import { env } from './src/config/env.js';
import { createClient } from '@supabase/supabase-js';

const db = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function run() {
  const q = db.from('products').select('*, categories(name)').limit(5);
  const { data } = await q;
  const ids = data.map(p => p.id);
  const { data: inv, error } = await db.from('inventory').select('product_id, quantity, reserved_quantity').in('product_id', ids);
  console.log('Error:', error);
  console.log('Inventory Rows:', inv);
}
run().catch(console.error);
