import { z } from 'zod';
import { inrAmountSchema } from './common.schema.js';

export const createCreditAccountSchema = z.object({
  customer_id:   z.string().uuid(),
  credit_limit:  inrAmountSchema,
  credit_days:   z.number().int().positive().max(365),
  payment_terms: z.string().max(100).optional().nullable(),
});

export const updateCreditLimitSchema = z.object({
  credit_limit:  inrAmountSchema,
  credit_days:   z.number().int().positive().max(365).optional(),
  payment_terms: z.string().max(100).optional().nullable(),
});

export const freezeCreditSchema = z.object({
  reason: z.string().min(1).max(500),
});

export const createCreditNoteSchema = z.object({
  customer_id:    z.string().uuid(),
  return_id:      z.string().uuid().optional().nullable(),
  invoice_id:     z.string().uuid().optional().nullable(),
  amount:         inrAmountSchema,
  applied_amount: inrAmountSchema.default(0),
  reason:         z.string().min(1).max(500),
  notes:          z.string().max(1000).optional().nullable(),
});

export const createDebitNoteSchema = z.object({
  customer_id: z.string().uuid(),
  payment_id:  z.string().uuid().optional().nullable(),
  amount:      inrAmountSchema,
  reason:      z.string().min(1).max(500),
  notes:       z.string().max(1000).optional().nullable(),
});
