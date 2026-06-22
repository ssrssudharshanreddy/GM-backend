import { z } from 'zod';

const LEAD_SOURCES = ['COLD_CALL', 'REFERRAL', 'WALK_IN', 'SOCIAL_MEDIA', 'EXHIBITION', 'OTHER'];
const LEAD_STATUSES = ['NEW', 'CONTACTED', 'INTERESTED', 'NEGOTIATING', 'CONVERTED', 'LOST'];
const VISIT_STATUSES = ['SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];

export const createLeadSchema = z.object({
  company_name:  z.string().min(2).max(200),
  contact_person: z.string().max(100).optional().nullable(),
  phone:          z.string().max(15).optional().nullable(),
  email:          z.string().email().optional().nullable(),
  city:           z.string().max(100).optional().nullable(),
  source:         z.enum(LEAD_SOURCES).default('OTHER'),
  initial_notes:  z.string().max(1000).optional().nullable(),
});

export const updateLeadSchema = z.object({
  company_name:   z.string().min(2).max(200).optional(),
  contact_person: z.string().max(100).optional().nullable(),
  phone:          z.string().max(15).optional().nullable(),
  email:          z.string().email().optional().nullable(),
  city:           z.string().max(100).optional().nullable(),
  source:         z.enum(LEAD_SOURCES).optional(),
  status:         z.enum(LEAD_STATUSES).optional(),
  loss_reason:    z.string().max(500).optional().nullable(),
  converted_customer_id: z.string().uuid().optional().nullable(),
}).strict();

export const createVisitSchema = z.object({
  customer_id:       z.string().uuid().optional().nullable(),
  lead_id:           z.string().uuid().optional().nullable(),
  scheduled_at:      z.string().datetime({ offset: true }),
  purpose:           z.string().min(1).max(300),
  notes:             z.string().max(1000).optional().nullable(),
}).refine((d) => d.customer_id || d.lead_id, { message: 'Either customer_id or lead_id is required' });

export const completeVisitSchema = z.object({
  actual_at:        z.string().datetime({ offset: true }),
  status:           z.enum(VISIT_STATUSES),
  outcome:          z.string().max(500).optional().nullable(),
  notes:            z.string().max(1000).optional().nullable(),
  next_action:      z.string().max(300).optional().nullable(),
  next_followup_date: z.string().date().optional().nullable(),
});

export const createFollowUpSchema = z.object({
  customer_id: z.string().uuid().optional().nullable(),
  lead_id:     z.string().uuid().optional().nullable(),
  visit_id:    z.string().uuid().optional().nullable(),
  title:       z.string().min(1).max(200),
  notes:       z.string().max(1000).optional().nullable(),
  due_date:    z.string().date(),
});

export const listLeadsSchema = z.object({
  page:   z.coerce.number().int().min(1).default(1),
  limit:  z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(LEAD_STATUSES).optional(),
  search: z.string().max(100).optional(),
});
