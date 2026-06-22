import { z } from 'zod';
import { indianGstSchema, indianPhoneSchema, inrAmountSchema } from './common.schema.js';

export const createApplicationSchema = z.object({
  company_name:     z.string().min(2).max(200),
  contact_person:   z.string().min(2).max(100),
  phone:            indianPhoneSchema,
  alternate_phone:  indianPhoneSchema.optional().nullable(),
  // email is required for auth account creation
  email:            z.string().email(),
  // Password must be at least 8 chars; confirm_password validated with refine
  password:         z.string().min(8, 'Password must be at least 8 characters'),
  confirm_password: z.string().min(1),
  gst_number:       indianGstSchema,
  pan_number:       z.string().regex(/^[A-Z]{5}\d{4}[A-Z]$/, 'Invalid PAN').optional().nullable(),
  address_line1:    z.string().min(1).max(200),
  address_line2:    z.string().max(200).optional().nullable(),
  city:             z.string().min(1).max(100),
  state:            z.string().min(1).max(100),
  pincode:          z.string().regex(/^\d{6}$/, 'Invalid pincode'),
  business_type:    z.string().max(100).optional().nullable(),
  annual_turnover:  inrAmountSchema.optional().nullable(),
  notes:            z.string().max(1000).optional().nullable(),
}).refine((d) => d.password === d.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
});

export const updateCustomerSchema = z.object({
  contact_person:  z.string().min(2).max(100).optional(),
  phone:           indianPhoneSchema.optional(),
  alternate_phone: indianPhoneSchema.optional().nullable(),
  email:           z.string().email().optional().nullable(),
  gst_number:      indianGstSchema,
  pan_number:      z.string().regex(/^[A-Z]{5}\d{4}[A-Z]$/).optional().nullable(),
  address_line1:   z.string().min(1).max(200).optional(),
  address_line2:   z.string().max(200).optional().nullable(),
  city:            z.string().min(1).max(100).optional(),
  state:           z.string().min(1).max(100).optional(),
  pincode:         z.string().regex(/^\d{6}$/).optional(),
}).strict();

export const listCustomersSchema = z.object({
  page:   z.coerce.number().int().min(1).default(1),
  limit:  z.coerce.number().int().min(1).max(100).default(20),
  status: z.string().optional(),
  search: z.string().max(100).optional(),
  assigned_crem_id: z.string().uuid().optional(),
});

export const reviewApplicationSchema = z.object({
  status: z.enum([
    'PENDING_CRE_REVIEW', 'ACTION_REQUIRED', 'PENDING_ACCOUNTS_REVIEW',
    'CREDIT_SETUP_IN_PROGRESS', 'APPROVED', 'REJECTED',
  ]),
  notes: z.string().max(1000).optional().nullable(),
});

export const assignCremSchema = z.object({
  crem_id: z.string().uuid(),
});
