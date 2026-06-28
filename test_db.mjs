import { env } from './src/config/env.js';
import { createClient } from '@supabase/supabase-js';
const adminClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function run() {
  const { data: users } = await adminClient.auth.admin.listUsers();
  const wsUser = users.users.find(u => u.user_metadata?.role === 'WS');
  if (!wsUser) return console.log('No WS user');

  const { data: order } = await adminClient.from('orders').select('*').eq('assigned_ws_id', wsUser.id).limit(1).single();
  if (!order) return console.log('No order assigned to WS user');

  console.log('WS User:', wsUser.id);
  console.log('Order:', order.id);

  // use a normal client to test RLS
  const jwt = await adminClient.auth.admin.generateLink({ type: 'magiclink', email: wsUser.email });
  // Wait, can't easily get JWT this way. We will use the REST API directly or just assume it's orders.
  
  // Let's just fetch the policy from Postgres using RPC if available, or just fetch the tables.
  const { data, error } = await adminClient.from('orders').select('status').limit(1);
  console.log('Test:', error ? error.message : 'OK');
}
run().catch(console.error);
