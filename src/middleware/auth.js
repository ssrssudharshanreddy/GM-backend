import { createRemoteJWKSet, jwtVerify } from 'jose';
import { env } from '../config/env.js';
import { getRequestClient } from '../config/supabase.js';
import { Err } from '../utils/errors.js';

// Cache the JWKS remotely — jose handles key rotation automatically
const JWKS = createRemoteJWKSet(new URL(env.SUPABASE_JWKS_URL));

/**
 * Extracts and verifies the Supabase JWT from the Authorization header.
 * Sets req.user = { id, role, email } and req.db = per-request Supabase client.
 */
export async function authenticate(req, _res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return next(Err.unauthorized('Missing or malformed Authorization header'));
    }

    const token = authHeader.slice(7);

    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `${env.SUPABASE_URL}/auth/v1`,
    });

    const role = payload.app_metadata?.role ?? payload.user_metadata?.role ?? null;

    req.user = {
      id: payload.sub,
      role,
      email: payload.email ?? null,
      token,
    };

    // Per-request Supabase client — all queries run as this user (RLS enforced)
    req.db = getRequestClient(token);

    next();
  } catch (err) {
    if (err.code === 'ERR_JWT_EXPIRED') return next(Err.unauthorized('Token expired'));
    if (err.code === 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED') return next(Err.unauthorized('Invalid token'));
    next(Err.unauthorized('Authentication failed'));
  }
}

/**
 * Role-based guard. Must be used AFTER authenticate.
 * @param {...string} roles — allowed roles
 */
export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(Err.unauthorized());
    if (!roles.includes(req.user.role)) {
      return next(Err.forbidden(`Role '${req.user.role}' is not permitted for this action`));
    }
    next();
  };
}

/** Shorthand guards */
export const isCEO      = requireRole('CEO');
export const isCRE      = requireRole('CEO', 'CRE');
export const isAE       = requireRole('CEO', 'AE');
export const isWE       = requireRole('CEO', 'WE');
export const isCREM     = requireRole('CEO', 'CREM');
export const isEmployee = requireRole('CEO', 'CRE', 'CREM', 'AE', 'WE', 'WS');
export const isCustomer = requireRole('CUSTOMER');
export const isInternal = requireRole('CEO', 'CRE', 'CREM', 'AE', 'WE', 'WS');
