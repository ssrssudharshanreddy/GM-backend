import { env } from './src/config/env.js';
import { createClient } from '@supabase/supabase-js';

const db = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function run() {
  const { data: users } = await db.auth.admin.listUsers();
  const wsUser = users.users.find(u => u.user_metadata?.role === 'WS');
  console.log('WS User:', wsUser?.email, wsUser?.id);
  
  if (!wsUser) return console.log('No WS user');

  const wsClient = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  
  // Login as WS (since I don't know password, I will just create a custom JWT or use the service role to sign one, OR just sign in if I know a password)
  // Since we have service role, we can just use the user ID to see if the RLS fails.
  // Actually, we can use an RPC or just manually test it on a dummy user, or bypass it by using PostgREST JWT.
}
run().catch(console.error);
