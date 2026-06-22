import * as authService from '../services/auth.service.js';
import { sendSuccess } from '../utils/response.js';

export async function login(req, res) {
  const result = await authService.login(req.body);
  sendSuccess(res, result);
}

export async function refreshToken(req, res) {
  const result = await authService.refreshToken(req.body.refresh_token);
  sendSuccess(res, result);
}

export async function changePassword(req, res) {
  await authService.changePassword(req.db, req.body);
  sendSuccess(res, { message: 'Password changed successfully' });
}

export async function getMyProfile(req, res) {
  const profile = await authService.getMyProfile(req.db, req.user.id);
  sendSuccess(res, profile);
}

export async function logout(_req, res) {
  // JWT is stateless; client must discard the token.
  // Supabase session invalidation is optional via admin API.
  sendSuccess(res, { message: 'Logged out successfully' });
}
