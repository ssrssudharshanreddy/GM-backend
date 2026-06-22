import { z } from 'zod';

const TICKET_CATEGORIES = [
  'ORDER_ISSUE', 'PAYMENT_ISSUE', 'RETURN_ISSUE',
  'DELIVERY_ISSUE', 'PRODUCT_QUALITY', 'ACCOUNT_ISSUE', 'OTHER',
];

export const createTicketSchema = z.object({
  category: z.enum(TICKET_CATEGORIES),
  subject:  z.string().min(5).max(200),
  message:  z.string().min(10).max(2000),
});

export const addMessageSchema = z.object({
  message:          z.string().min(1).max(5000),
  is_internal_note: z.boolean().default(false),
});

export const updateTicketSchema = z.object({
  status:           z.enum(['OPEN', 'IN_PROGRESS', 'ESCALATED', 'RESOLVED', 'CLOSED']).optional(),
  assigned_crem_id: z.string().uuid().optional().nullable(),
  escalated_to:     z.string().uuid().optional().nullable(),
  escalation_reason: z.string().max(500).optional().nullable(),
}).strict();

export const listTicketsSchema = z.object({
  page:             z.coerce.number().int().min(1).default(1),
  limit:            z.coerce.number().int().min(1).max(100).default(20),
  status:           z.string().optional(),
  category:         z.enum(TICKET_CATEGORIES).optional(),
  customer_id:      z.string().uuid().optional(),
  assigned_crem_id: z.string().uuid().optional(),
});
