import rateLimit from 'express-rate-limit';

/** General API rate limiter — 300 requests / 15 min per IP */
export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please slow down', code: 'RATE_LIMITED' },
});

/** Stricter limiter for auth routes — 20 requests / 15 min */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many auth attempts', code: 'RATE_LIMITED' },
});

/** Strict limiter for PIN verification — 10 per 15 min */
export const pinRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many PIN attempts', code: 'RATE_LIMITED' },
});
