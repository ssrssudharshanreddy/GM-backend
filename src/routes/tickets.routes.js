import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validateBody, validateQuery, validateParams } from '../middleware/validate.js';
import { authenticate, isCustomer, isCREM, requireRole } from '../middleware/auth.js';
import * as ctrl from '../controllers/tickets.controller.js';
import { createTicketSchema, addMessageSchema, updateTicketSchema, listTicketsSchema } from '../schemas/ticket.schema.js';
import { idParamSchema } from '../schemas/common.schema.js';

const router = Router();
router.use(authenticate);

// All authenticated users may list/view tickets (RLS scopes by ownership/assignment)
router.get(  '/',    validateQuery(listTicketsSchema), asyncHandler(ctrl.list));
router.get(  '/:id', validateParams(idParamSchema),   asyncHandler(ctrl.getById));

// Only customers create tickets
router.post( '/',    isCustomer, validateBody(createTicketSchema), asyncHandler(ctrl.create));

// CRE, CREM (and CEO) may update ticket metadata (status, assignment, etc.)
router.patch('/:id', requireRole('CEO', 'CREM', 'CRE'), validateParams(idParamSchema), validateBody(updateTicketSchema), asyncHandler(ctrl.update));

// Only ticket participants may add messages: customer who raised it, CRM team, or AE/CRE
// WE and WS are excluded — they have no customer-facing support role
router.post( '/:id/messages',
  requireRole('CUSTOMER','CEO','CRE','CREM','AE'),
  validateParams(idParamSchema),
  validateBody(addMessageSchema),
  asyncHandler(ctrl.addMessage),
);

// Customer, CREM, and CEO may close a ticket
router.post( '/:id/close', requireRole('CEO','CREM','CUSTOMER'), validateParams(idParamSchema), asyncHandler(ctrl.close));

export default router;
