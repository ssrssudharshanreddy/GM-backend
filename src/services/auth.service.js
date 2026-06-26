import { adminClient } from '../config/supabase.js';
import { Err } from '../utils/errors.js';
import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';

/**
 * Sign in via Supabase Auth (email + password).
 * Returns { access_token, refresh_token, user }.
 */
export async function login({ email, password }) {
  // Use a per-request client for auth so we don't mutate adminClient's session
  const authClient = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await authClient.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.message.includes('Invalid login')) throw Err.unauthorized('Invalid email or password');
    throw Err.fromSupabase(error) ?? error;
  }

  let role = data.user.app_metadata?.role;
  let access_token = data.session.access_token;
  let refresh_token = data.session.refresh_token;
  let expires_in = data.session.expires_in;

  if (!role) {
    const { data: emp, error: empErr } = await adminClient.from('employee_profiles').select('role').eq('id', data.user.id).maybeSingle();
    if (empErr) throw Err.badRequest(`DB error querying employee: ${empErr.message}`);
    
    if (emp) role = emp.role;
    else {
      const { data: cust, error: custErr } = await adminClient.from('customer_profiles').select('id').eq('id', data.user.id).maybeSingle();
      if (custErr) throw Err.badRequest(`DB error querying customer: ${custErr.message}`);
      if (cust) role = 'CUSTOMER';
    }

    if (role) {
      const updateRes = await adminClient.auth.admin.updateUserById(data.user.id, {
        app_metadata: { ...data.user.app_metadata, role }
      });
      if (updateRes.error) throw Err.badRequest(`Error updating app_metadata: ${updateRes.error.message}`);
      
      const refreshed = await authClient.auth.refreshSession({ refresh_token });
      if (refreshed.error) throw Err.badRequest(`Error refreshing session: ${refreshed.error.message}`);
      
      if (refreshed.data?.session) {
        access_token = refreshed.data.session.access_token;
        refresh_token = refreshed.data.session.refresh_token;
        expires_in = refreshed.data.session.expires_in;
      }
    }
  }

  return {
    access_token,
    refresh_token,
    expires_in,
    user: {
      id:    data.user.id,
      email: data.user.email,
      role:  role,
    },
  };
}

/**
 * Refresh access token using a refresh_token.
 */
export async function refreshToken(refresh_token) {
  const { data, error } = await adminClient.auth.refreshSession({ refresh_token });
  if (error) throw Err.unauthorized('Invalid or expired refresh token');
  return {
    access_token:  data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_in:    data.session.expires_in,
  };
}

/**
 * Change own password — called with the user's own session client.
 */
export async function changePassword(userId, { new_password }) {
  const { error } = await adminClient.auth.admin.updateUserById(userId, { password: new_password });
  if (error) throw Err.fromSupabase(error) ?? error;
}

/**
 * Get own profile.
 */
export async function getMyProfile(db, userId) {
  // Try employee_profiles first, then customer_profiles
  const { data: emp } = await db
    .from('employee_profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (emp) return { type: 'employee', profile: emp };

  const { data: cust } = await db
    .from('customer_profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (cust) return { type: 'customer', profile: cust };

  throw Err.notFound('Profile');
}

/**
 * Initiate password reset.
 */
export async function forgotPassword(email) {
  const { error } = await adminClient.auth.resetPasswordForEmail(email);
  if (error) throw Err.fromSupabase(error) ?? error;
}
