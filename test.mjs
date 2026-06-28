import { env } from './src/config/env.js';
import { createClient } from '@supabase/supabase-js';
const adminClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function run() {
  const { data: users } = await adminClient.auth.admin.listUsers();
  const wsUser = users.users.find(u => u.user_metadata?.role === 'WS');
  if (!wsUser) return console.log('No WS user');

  // get an order assigned to WS user
  const { data: order } = await adminClient.from('orders').select('*').eq('assigned_ws_id', wsUser.id).limit(1).single();
  if (!order) return console.log('No order assigned to WS user');

  console.log('Order:', order.id);

  // update order as WS user
  const { data, error } = await adminClient.rpc('execute_sql', { sql: 
    set local role authenticated;
    set local request.jwt.claims = '{"role":"authenticated", "sub":"", "app_metadata": {"role": "WS"}}';
    update orders set status = 'OUT_FOR_DELIVERY' where id = '';
  });

  console.log('Result:', data, error);
}
run().catch(console.error);
