import { z } from 'zod';
import { inrAmountSchema } from './common.schema.js';

const PAYMENT_MODES = ['BANK_TRANSFER', 'NEFT', 'RTGS', 'IMPS', 'UPI', 'CHEQUE'];

export const submitPaymentSchema = z.object({
  invoice_id:       z.string().uuid(),
  amount:           inrAmountSchema,
  payment_mode:     z.enum(PAYMENT_MODES),
  payment_date:     z.string().date(),
  reference_number: z.string().min(1).max(100),
  cheque_number:    z.string().max(50).optional().nullable(),
  bank_name:        z.string().max(100).optional().nullable(),
  remarks:          z.string().max(500).optional().nullable(),
});

export const verifyPaymentSchema = z.object({
  status:          z.enum(['VERIFIED', 'REJECTED']),
  rejection_reason: z.string().max(500).optional().nullable(),
});

export const dishonoredPaymentSchema = z.object({
  dishonor_reason: z.string().min(1).max(500),
  dishonored_at:   z.string().datetime({ offset: true }),
});

export const createCommitmentSchema = z.object({
  customer_id:     z.string().uuid(),
  invoice_id:      z.string().uuid(),
  amount:          inrAmountSchema,
  commitment_date: z.string().date(),
  notes:           z.string().max(500).optional().nullable(),
});

export const listPaymentsSchema = z.object({
  page:        z.coerce.number().int().min(1).default(1),
  limit:       z.coerce.number().int().min(1).max(100).default(20),
  status:      z.enum(['PENDING_VERIFICATION', 'VERIFIED', 'REJECTED', 'DISHONORED']).optional(),
  customer_id: z.string().uuid().optional(),
  dateFrom:    z.string().optional(),
  dateTo:      z.string().optional(),
});
