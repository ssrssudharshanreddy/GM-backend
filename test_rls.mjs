import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

// Simulate anon/customer client (no service role) — same as what req.db uses for customers
const anonClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

const { data, error } = await anonClient
  .from('products')
  .select('name, inventory(quantity, reserved_quantity)')
  .limit(2);

console.log('error:', error?.message);
console.log('inventory via anon client:');
data?.forEach(p => console.log(' -', p.name, '→ inventory:', p.inventory));
