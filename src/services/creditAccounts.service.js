import * as repo from '../repositories/creditAccounts.repository.js';
import { Err } from '../utils/errors.js';
import { buildPaginationMeta } from '../utils/pagination.js';

export async function list(db, query) {
  const { data, count } = await repo.findAll(db, query);
  const mapped = (data || []).map(a => ({
    ...a,
    available_credit: Math.max(0, Number(a.credit_limit || 0) - Number(a.used_credit || 0)),
    outstanding_amount: Number(a.used_credit || 0),
  }));
  return { accounts: mapped, pagination: buildPaginationMeta({ page: query.page, limit: query.limit, total: count }) };
}

export async function getByCustomer(db, customerId) {
  const a = await repo.findByCustomer(db, customerId);
  if (!a) throw Err.notFound('Credit account');

  // Query all invoices for this customer to calculate totals
  const { data: invoices, error } = await db
    .from('invoices')
    .select('total_amount, outstanding_amount, status, due_date')
    .eq('customer_id', customerId);

  if (error) {
    console.error('Error fetching invoices for credit calculations:', error);
  }

  const now = new Date();
  let totalInvoiced = 0;
  let totalOutstanding = 0;
  let overdueAmount = 0;

  if (invoices) {
    for (const inv of invoices) {
      totalInvoiced += Number(inv.total_amount || 0);
      totalOutstanding += Number(inv.outstanding_amount || 0);
      
      const isUnpaid = ['UNPAID', 'PARTIALLY_PAID', 'OVERDUE'].includes(inv.status);
      const isOverdue = isUnpaid && inv.due_date && new Date(inv.due_date) < now;
      if (isOverdue) {
        overdueAmount += Number(inv.outstanding_amount || 0);
      }
    }
  }

  return {
    ...a,
    available_credit: Math.max(0, Number(a.credit_limit || 0) - Number(a.used_credit || 0)),
    outstanding_amount: Number(a.used_credit || 0),
    total_invoiced: totalInvoiced,
    total_paid: Math.max(0, totalInvoiced - totalOutstanding),
    overdue_amount: overdueAmount,
  };
}

export async function create(db, body, actorId) {
  const existing = await repo.findByCustomer(db, body.customer_id);
  if (existing) throw Err.conflict('Credit account already exists for this customer');
  const a = await repo.create(db, { ...body, created_by: actorId });
  return {
    ...a,
    available_credit: Math.max(0, Number(a.credit_limit || 0) - Number(a.used_credit || 0)),
    outstanding_amount: Number(a.used_credit || 0),
    total_invoiced: 0,
    total_paid: 0,
    overdue_amount: 0,
  };
}

export async function updateLimit(db, customerId, body, actorId) {
  const account = await repo.findByCustomer(db, customerId);
  if (!account) throw Err.notFound('Credit account');
  const a = await repo.update(db, customerId, body);
  
  // Fetch invoices for getByCustomer calculations
  return getByCustomer(db, customerId);
}

export async function freeze(db, customerId, reason, actorId) {
  return repo.update(db, customerId, { is_frozen: true, freeze_reason: reason, frozen_by: actorId, frozen_at: new Date().toISOString() });
}

export async function unfreeze(db, customerId, actorId) {
  return repo.update(db, customerId, { is_frozen: false, freeze_reason: null });
}

export async function getHistory(db, customerId, query) {
  const { data, count } = await repo.findHistory(db, customerId, query);
  return { history: data, pagination: buildPaginationMeta({ page: query.page, limit: query.limit, total: count }) };
}
