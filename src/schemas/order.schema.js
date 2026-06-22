import { z } from 'zod';
import { inrAmountSchema } from './common.schema.js';

const ORDER_STATUSES = ['PENDING', 'CONFIRMED', 'PROCESSING', 'PACKED', 'DISPATCHED', 'DELIVERED', 'CANCELLED', 'STOCK_HOLD'];

const addressSchema = z.object({
  line1:   z.string().min(1),
  line2:   z.string().optional(),
  city:    z.string().min(1),
  state:   z.string().min(1),
  pincode: z.string().regex(/^\d{6}$/),
});

const orderItemSchema = z.object({
  product_id: z.string().uuid(),
  quantity:   z.number().int().positive(),
});

export const createOrderSchema = z.object({
  delivery_address:     addressSchema,
  items:                z.array(orderItemSchema).min(1),
  special_instructions: z.string().max(500).optional().nullable(),
});

export const updateOrderStatusSchema = z.object({
  status:           z.enum(ORDER_STATUSES),
  assigned_we_id:   z.string().uuid().optional(),
  assigned_ws_id:   z.string().uuid().optional(),
  stock_hold_reason:   z.string().max(500).optional(),
  cancellation_reason: z.string().max(500).optional(),
});

export const listOrdersSchema = z.object({
  page:        z.coerce.number().int().min(1).default(1),
  limit:       z.coerce.number().int().min(1).max(100).default(20),
  status:      z.enum(ORDER_STATUSES).optional(),
  customer_id: z.string().uuid().optional(),
  dateFrom:    z.string().optional(),
  dateTo:      z.string().optional(),
});

export const generateDeliveryPinSchema = z.object({
  order_id: z.string().uuid(),
});

export const verifyDeliveryPinSchema = z.object({
  pin:       z.string().min(4).max(8),
  latitude:  z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});
