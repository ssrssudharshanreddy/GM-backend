import { z } from 'zod';

export const uuidSchema = z.string().uuid('Invalid UUID');

export const paginationSchema = z.object({
  page:  z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const dateRangeSchema = z.object({
  dateFrom: z.string().datetime({ offset: true }).optional(),
  dateTo:   z.string().datetime({ offset: true }).optional(),
});

export const idParamSchema = z.object({ id: uuidSchema });

export const indianGstSchema = z
  .string()
  .regex(/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, 'Invalid GST number format')
  .optional()
  .nullable();

export const indianPhoneSchema = z
  .string()
  .regex(/^[6-9]\d{9}$/, 'Invalid Indian mobile number (10 digits starting 6-9)');

export const inrAmountSchema = z.number().nonnegative().multipleOf(0.01);
