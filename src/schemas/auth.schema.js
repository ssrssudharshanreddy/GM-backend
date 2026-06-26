import { z } from 'zod';

export const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(6),
});

export const refreshSchema = z.object({
  refresh_token: z.string().min(1),
});

export const changePasswordSchema = z.object({
  current_password: z.string().min(6),
  new_password:     z.string().min(8),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});
