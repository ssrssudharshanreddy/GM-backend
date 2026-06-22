import { adminClient } from '../config/supabase.js';

export async function createAuthUser({ email, password, role, full_name }) {
  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role },
    user_metadata: { full_name },
  });
  if (error) throw error;
  return data.user;
}

export async function deleteAuthUser(userId) {
  const { error } = await adminClient.auth.admin.deleteUser(userId);
  if (error) throw error;
}

export async function updateAuthUser(userId, updates) {
  const { data, error } = await adminClient.auth.admin.updateUserById(userId, updates);
  if (error) throw error;
  return data.user;
}
