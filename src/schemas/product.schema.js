import { z } from 'zod';
import { inrAmountSchema } from './common.schema.js';

const GST_RATES = [0, 5, 12, 18, 28];

export const createCategorySchema = z.object({
  name:        z.string().min(1).max(100),
  description: z.string().max(500).optional().nullable(),
  is_active:   z.boolean().default(true),
});

export const updateCategorySchema = createCategorySchema.partial().strict();

export const createProductSchema = z.object({
  category_id:  z.string().uuid(),
  product_code: z.string().min(1).max(50).optional(), // auto-generated if omitted
  name:         z.string().min(1).max(200),
  description:  z.string().max(1000).optional().nullable(),
  unit:         z.string().min(1).max(50),
  price:        inrAmountSchema,
  gst_rate:     z.number().refine((v) => GST_RATES.includes(v), { message: 'Invalid GST rate. Allowed: 0,5,12,18,28' }),
  is_active:    z.boolean().default(true),
});

export const updateProductSchema = createProductSchema.partial().omit({ product_code: true }).strict();

export const listProductsSchema = z.object({
  page:        z.coerce.number().int().min(1).default(1),
  limit:       z.coerce.number().int().min(1).max(100).default(20),
  category_id: z.string().uuid().optional(),
  search:      z.string().max(100).optional(),
  is_active:   z.enum(['true', 'false']).optional(),
});
