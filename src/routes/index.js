import { Router } from 'express';

import authRoutes            from './auth.routes.js';
import employeesRoutes       from './employees.routes.js';
import customersRoutes       from './customers.routes.js';
import applicationsRoutes    from './applications.routes.js';
import categoriesRoutes      from './categories.routes.js';
import productsRoutes        from './products.routes.js';
import inventoryRoutes       from './inventory.routes.js';
import ordersRoutes          from './orders.routes.js';
import deliveryPinsRoutes    from './deliveryPins.routes.js';
import deliveryProofsRoutes  from './deliveryProofs.routes.js';
import invoicesRoutes        from './invoices.routes.js';
import paymentsRoutes        from './payments.routes.js';
import paymentCommitmentsRoutes from './paymentCommitments.routes.js';
import creditAccountsRoutes  from './creditAccounts.routes.js';
import creditNotesRoutes     from './creditNotes.routes.js';
import debitNotesRoutes      from './debitNotes.routes.js';
import returnsRoutes         from './returns.routes.js';
import returnPinsRoutes      from './returnPins.routes.js';
import returnProofsRoutes    from './returnProofs.routes.js';
import ticketsRoutes         from './tickets.routes.js';
import leadsRoutes           from './leads.routes.js';
import visitsRoutes          from './visits.routes.js';
import followUpsRoutes       from './followUps.routes.js';
import customerNotesRoutes   from './customerNotes.routes.js';
import collectionTasksRoutes from './collectionTasks.routes.js';
import notificationsRoutes   from './notifications.routes.js';
import systemSettingsRoutes  from './systemSettings.routes.js';
import reportsRoutes         from './reports.routes.js';

const router = Router();

// ─── Auth ─────────────────────────────────────────────────────────────────────
router.use('/auth',                authRoutes);

// ─── People ───────────────────────────────────────────────────────────────────
router.use('/employees',           employeesRoutes);
router.use('/customers',           customersRoutes);
router.use('/applications',        applicationsRoutes);

// ─── Catalog ──────────────────────────────────────────────────────────────────
router.use('/categories',          categoriesRoutes);
router.use('/products',            productsRoutes);
router.use('/inventory',           inventoryRoutes);

// ─── Orders & Delivery ────────────────────────────────────────────────────────
router.use('/orders',              ordersRoutes);
router.use('/delivery',            deliveryPinsRoutes);   // /delivery/orders/:orderId/pin
router.use('/orders/:orderId/proofs', deliveryProofsRoutes);

// ─── Finance ──────────────────────────────────────────────────────────────────
router.use('/invoices',            invoicesRoutes);
router.use('/payments',            paymentsRoutes);
router.use('/payment-commitments', paymentCommitmentsRoutes);
router.use('/credit-accounts',     creditAccountsRoutes);
router.use('/credit-notes',        creditNotesRoutes);
router.use('/debit-notes',         debitNotesRoutes);

// ─── Returns ──────────────────────────────────────────────────────────────────
router.use('/returns',             returnsRoutes);
router.use('/returns/:returnId/pins',   returnPinsRoutes);
router.use('/returns/:returnId/proofs', returnProofsRoutes);

// ─── Support ──────────────────────────────────────────────────────────────────
router.use('/tickets',             ticketsRoutes);

// ─── CRM Activities ───────────────────────────────────────────────────────────
router.use('/leads',               leadsRoutes);
router.use('/visits',              visitsRoutes);
router.use('/follow-ups',          followUpsRoutes);
router.use('/customers/:customerId/notes', customerNotesRoutes);
router.use('/collection-tasks',    collectionTasksRoutes);

// ─── Platform ─────────────────────────────────────────────────────────────────
router.use('/notifications',       notificationsRoutes);
router.use('/system-settings',     systemSettingsRoutes);
router.use('/reports',             reportsRoutes);

export default router;
