import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';

/**
 * Admin client — uses service_role key, bypasses RLS.
 * Use only for:
 *   - Creating / deleting auth.users
 *   - Admin-only DB operations
 *   - Background jobs / cron
 */
export const adminClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/**
 * Per-request client factory — uses caller's JWT.
 * All queries go through RLS as if the user made them directly.
 * @param {string} jwtToken - the raw Bearer token from Authorization header
 */
export function getRequestClient(jwtToken) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${jwtToken}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
