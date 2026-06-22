import { z } from 'zod';

const ADJUSTMENT_TYPES = ['MANUAL_ADD', 'MANUAL_REMOVE', 'DAMAGE_WRITE_OFF', 'INITIAL_STOCK'];

export const adjustInventorySchema = z.object({
  product_id:      z.string().uuid(),
  adjustment_type: z.enum(ADJUSTMENT_TYPES),
  quantity_change: z.number().int().refine((v) => v !== 0, { message: 'quantity_change cannot be 0' }),
  reason:          z.string().min(1).max(300),
  reorder_threshold: z.number().int().nonnegative().optional(),
});

export const updateThresholdSchema = z.object({
  reorder_threshold: z.number().int().nonnegative(),
});

export const listMovementsSchema = z.object({
  page:        z.coerce.number().int().min(1).default(1),
  limit:       z.coerce.number().int().min(1).max(100).default(20),
  product_id:  z.string().uuid().optional(),
  dateFrom:    z.string().optional(),
  dateTo:      z.string().optional(),
});
