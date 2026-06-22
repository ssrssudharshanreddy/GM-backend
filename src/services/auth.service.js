import { adminClient } from '../config/supabase.js';
import { Err } from '../utils/errors.js';

/**
 * Sign in via Supabase Auth (email + password).
 * Returns { access_token, refresh_token, user }.
 */
export async function login({ email, password }) {
  const { data, error } = await adminClient.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.message.includes('Invalid login')) throw Err.unauthorized('Invalid email or password');
    throw Err.fromSupabase(error) ?? error;
  }
  return {
    access_token:  data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_in:    data.session.expires_in,
    user: {
      id:    data.user.id,
      email: data.user.email,
      role:  data.user.app_metadata?.role,
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
export async function changePassword(db, { new_password }) {
  const { error } = await db.auth.updateUser({ password: new_password });
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
