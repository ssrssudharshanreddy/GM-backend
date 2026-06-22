import { z } from 'zod';

const RETURN_REASONS = ['DAMAGED', 'DEFECTIVE', 'WRONG_ITEM', 'EXCESS_QUANTITY', 'QUALITY_ISSUE', 'OTHER'];
const RETURN_TYPES   = ['FULL', 'PARTIAL'];

const returnItemSchema = z.object({
  order_item_id: z.string().uuid(),
  product_id:    z.string().uuid(),
  quantity:      z.number().int().positive(),
  reason:        z.enum(RETURN_REASONS),
});

export const createReturnSchema = z.object({
  order_id:     z.string().uuid(),
  return_type:  z.enum(RETURN_TYPES),
  items:        z.array(returnItemSchema).min(1),
  notes:        z.string().max(500).optional().nullable(),
});

export const updateReturnStatusSchema = z.object({
  status: z.enum([
    'UNDER_REVIEW', 'RETURN_APPROVED', 'RETURN_REJECTED',
    'PICKUP_SCHEDULED', 'OUT_FOR_PICKUP',
    'COLLECTED', 'RETURNED_TO_WAREHOUSE', 'RETURN_COMPLETED',
  ]),
  pickup_scheduled_date: z.string().date().optional().nullable(),
  assigned_ws_id:        z.string().uuid().optional(),
  rejection_reason:      z.string().max(500).optional().nullable(),
  // window_override removed — CEO-only override handled server-side via role check, not a client flag
});

export const updateReturnItemOutcomeSchema = z.object({
  items: z.array(z.object({
    id:            z.string().uuid(),
    outcome:       z.enum(['SALEABLE', 'DAMAGED', 'DISPOSED', 'PENDING']),
    outcome_notes: z.string().max(300).optional().nullable(),
  })),
});

export const verifyReturnPinSchema = z.object({
  pin:       z.string().min(4).max(8),
  latitude:  z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

export const listReturnsSchema = z.object({
  page:        z.coerce.number().int().min(1).default(1),
  limit:       z.coerce.number().int().min(1).max(100).default(20),
  status:      z.string().optional(),
  customer_id: z.string().uuid().optional(),
  dateFrom:    z.string().optional(),
  dateTo:      z.string().optional(),
});
