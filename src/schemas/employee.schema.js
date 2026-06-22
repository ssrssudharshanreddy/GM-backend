import { z } from 'zod';
import { indianPhoneSchema } from './common.schema.js';

const ROLES = ['CEO', 'CRE', 'CREM', 'AE', 'WE', 'WS'];
const STATUSES = ['ACTIVE', 'SUSPENDED', 'BLOCKED'];

export const createEmployeeSchema = z.object({
  email:        z.string().email(),
  password:     z.string().min(8),
  full_name:    z.string().min(2).max(100),
  role:         z.enum(ROLES),
  phone:        indianPhoneSchema.optional(),
  reporting_to: z.string().uuid().optional().nullable(),
  designation:  z.string().max(100).optional().nullable(),
  employee_code: z.string().max(20).optional().nullable(),
});

export const updateEmployeeSchema = z.object({
  full_name:    z.string().min(2).max(100).optional(),
  phone:        indianPhoneSchema.optional(),
  reporting_to: z.string().uuid().optional().nullable(),
  designation:  z.string().max(100).optional().nullable(),
  status:       z.enum(STATUSES).optional(),
}).strict();

export const listEmployeesSchema = z.object({
  page:   z.coerce.number().int().min(1).default(1),
  limit:  z.coerce.number().int().min(1).max(100).default(20),
  role:   z.enum(ROLES).optional(),
  status: z.enum(STATUSES).optional(),
  search: z.string().max(100).optional(),
});
