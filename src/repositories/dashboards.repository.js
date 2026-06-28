import { Err } from '../utils/errors.js';

// ─── Helper ───────────────────────────────────────────────────────────────────
async function q(promise) {
  const { data, error, count } = await promise;
  if (error) throw Err.fromSupabase(error);
  return { data: data ?? [], count: count ?? 0 };
}

// ─── CEO ──────────────────────────────────────────────────────────────────────
export async function getCEODashboard(db) {
  const [orders, customers, invoiceRes, payments] = await Promise.all([
    q(db.from('orders').select('status', { count: 'exact', head: true })),
    q(db.from('customer_profiles').select('status', { count: 'exact', head: true })),
    q(db.from('invoices').select('status,total_amount').in('status', ['UNPAID', 'OVERDUE'])),
    q(db.from('payments').select('status', { count: 'exact', head: true }).eq('status', 'PENDING_VERIFICATION')),
  ]);

  const unpaid = invoiceRes.data;
  const totalOutstanding = unpaid.reduce((s, i) => s + (Number(i.total_amount) || 0), 0);
  const overdueCount     = unpaid.filter(i => i.status === 'OVERDUE').length;

  return {
    kpis: {
      total_customers:   customers.count,
      total_orders:      orders.count,
      total_outstanding: totalOutstanding,
      overdue_invoices:  overdueCount,
      pending_payments:  payments.count,
    },
  };
}

export async function getCEOFinancials(db) {
  const [outstanding, revenue, efficiency] = await Promise.all([
    q(db.from('v_outstanding_balance').select('*').order('total_outstanding', { ascending: false }).limit(20)),
    q(db.from('v_revenue_vs_target').select('*')),
    q(db.from('mv_collection_efficiency').select('*')),
  ]);
  return {
    outstanding:        outstanding.data,
    revenue_vs_target:  revenue.data,
    collection_efficiency: efficiency.data,
  };
}

export async function getCEOWarehouse(db) {
  const [inv, lowStock, pendingReturns] = await Promise.all([
    q(db.from('v_inventory_summary').select('*')),
    q(db.from('inventory_items')
      .select('*, products(name, product_code, category_id)')
      .filter('quantity', 'lt', 'reorder_level')
      .limit(20)),
    q(db.from('returns').select('status', { count: 'exact', head: true })
      .in('status', ['RETURN_APPROVED', 'PICKUP_SCHEDULED', 'OUT_FOR_PICKUP'])),
  ]);
  return {
    inventory_summary: inv.data,
    low_stock_items:   lowStock.data,
    pending_returns:   pendingReturns.count,
  };
}

// ─── AE ───────────────────────────────────────────────────────────────────────
export async function getAEDashboard(db) {
  const [payments, invoices, collectionTasks, applications] = await Promise.all([
    q(db.from('payments').select('status', { count: 'exact', head: true }).eq('status', 'PENDING_VERIFICATION')),
    q(db.from('invoices').select('status,total_amount').in('status', ['UNPAID', 'OVERDUE'])),
    q(db.from('collection_tasks').select('status', { count: 'exact', head: true }).eq('status', 'OPEN')),
    q(db.from('customer_applications').select('status', { count: 'exact', head: true })
      .in('status', ['PENDING_AE_REVIEW', 'UNDER_REVIEW'])),
  ]);

  const allInv = invoices.data;
  const totalOutstanding = allInv.reduce((s, i) => s + (Number(i.total_amount) || 0), 0);
  const overdueCount     = allInv.filter(i => i.status === 'OVERDUE').length;

  return {
    kpis: {
      pending_verifications: payments.count,
      total_outstanding:     totalOutstanding,
      overdue_invoices:      overdueCount,
      open_collection_tasks: collectionTasks.count,
      pending_applications:  applications.count,
      collected_mtd:         0,
    },
  };
}

export async function getAEOutstanding(db) {
  const { data, error } = await db
    .from('v_outstanding_balance')
    .select('*')
    .order('total_outstanding', { ascending: false });
  if (error) throw Err.fromSupabase(error);
  return { outstanding: data ?? [] };
}

export async function getAESummary(db) {
  const [payments, invoices, credit] = await Promise.all([
    q(db.from('payments').select('status,amount').in('status', ['PENDING_VERIFICATION', 'VERIFIED', 'REJECTED'])),
    q(db.from('invoices').select('status,total_amount').in('status', ['UNPAID', 'OVERDUE', 'PAID'])),
    q(db.from('credit_accounts').select('credit_limit,used_credit,available_credit,is_frozen')),
  ]);
  return {
    payments_by_status: payments.data,
    invoices_by_status: invoices.data,
    credit_accounts:    credit.data,
  };
}

// ─── CRE ──────────────────────────────────────────────────────────────────────
export async function getCREDashboard(db) {
  const [apps, customers, tickets, escalations] = await Promise.all([
    q(db.from('customer_applications').select('status', { count: 'exact', head: true })
      .in('status', ['PENDING_CRE_REVIEW', 'UNDER_REVIEW'])),
    q(db.from('customer_profiles').select('status', { count: 'exact', head: true }).eq('status', 'ACTIVE')),
    q(db.from('tickets').select('status', { count: 'exact', head: true })
      .in('status', ['OPEN', 'IN_PROGRESS'])),
    q(db.from('tickets').select('status', { count: 'exact', head: true })
      .eq('priority', 'HIGH').eq('status', 'OPEN')),
  ]);
  return {
    kpis: {
      pending_applications: apps.count,
      active_customers:     customers.count,
      open_tickets:         tickets.count,
      action_required:      escalations.count,
    },
  };
}

export async function getCRESummary(db) {
  const [apps, recentCustomers, tickets] = await Promise.all([
    q(db.from('customer_applications').select('*').order('created_at', { ascending: false }).limit(10)),
    q(db.from('customer_profiles').select('*').order('created_at', { ascending: false }).limit(10)),
    q(db.from('tickets').select('*').order('created_at', { ascending: false }).limit(10)),
  ]);
  return {
    recent_applications: apps.data,
    recent_customers:    recentCustomers.data,
    recent_tickets:      tickets.data,
  };
}

// ─── CREM ─────────────────────────────────────────────────────────────────────
export async function getCREMDashboard(db) {
  const today = new Date().toISOString().slice(0, 10);
  const [visits, followUps, leads, tasks] = await Promise.all([
    q(db.from('visits').select('status', { count: 'exact', head: true }).eq('visit_date', today)),
    q(db.from('follow_ups').select('status', { count: 'exact', head: true })
      .in('status', ['PENDING', 'OVERDUE'])),
    q(db.from('leads').select('status', { count: 'exact', head: true })
      .in('status', ['NEW', 'CONTACTED', 'INTERESTED'])),
    q(db.from('collection_tasks').select('status', { count: 'exact', head: true }).eq('status', 'OPEN')),
  ]);
  return {
    kpis: {
      visits_today:          visits.count,
      pending_follow_ups:    followUps.count,
      active_leads:          leads.count,
      open_collection_tasks: tasks.count,
    },
  };
}

export async function getCREMSummary(db) {
  const [visits, followUps, leads] = await Promise.all([
    q(db.from('visits').select('*').order('created_at', { ascending: false }).limit(10)),
    q(db.from('follow_ups').select('*').order('follow_up_date', { ascending: true }).limit(10)),
    q(db.from('leads').select('*').order('created_at', { ascending: false }).limit(10)),
  ]);
  return {
    recent_visits:   visits.data,
    upcoming_follow_ups: followUps.data,
    recent_leads:    leads.data,
  };
}

// ─── WE ───────────────────────────────────────────────────────────────────────
export async function getWEDashboard(db) {
  const [orders, lowStock, returns, inventory, dispatched] = await Promise.all([
    q(db.from('orders').select('status', { count: 'exact', head: true })
      .in('status', ['CONFIRMED', 'PROCESSING'])),
    q(db.from('inventory_items').select('id', { count: 'exact', head: true })
      .filter('quantity', 'lt', 'reorder_level')),
    q(db.from('returns').select('status', { count: 'exact', head: true })
      .in('status', ['RETURN_APPROVED', 'PICKUP_SCHEDULED', 'COLLECTED'])),
    q(db.from('inventory_items').select('quantity,unit_cost')),
    q(db.from('orders').select('status', { count: 'exact', head: true }).eq('status', 'DISPATCHED')),
  ]);

  const invValue = inventory.data.reduce(
    (s, i) => s + ((Number(i.quantity) || 0) * (Number(i.unit_cost) || 0)), 0
  );

  return {
    kpis: {
      orders_to_process: orders.count,
      low_stock_items:   lowStock.count,
      pending_returns:   returns.count,
      dispatched_today:  dispatched.count,
      total_skus:        inventory.data.length,
      inventory_value:   invValue,
      ws_staff_active:   0,
      orders_today:      orders.count,
    },
  };
}

export async function getWESummary(db) {
  const [orders, returns, inv] = await Promise.all([
    q(db.from('orders').select('*').in('status', ['CONFIRMED','PROCESSING','PACKED']).order('created_at', { ascending: false }).limit(10)),
    q(db.from('returns').select('*').in('status', ['COLLECTED','RETURNED_TO_WAREHOUSE']).order('created_at', { ascending: false }).limit(10)),
    q(db.from('v_inventory_summary').select('*').limit(20)),
  ]);
  return {
    pending_orders:   orders.data,
    pending_returns:  returns.data,
    inventory_alerts: inv.data,
  };
}

// ─── WS ───────────────────────────────────────────────────────────────────────
export async function getWSDashboard(db) {
  const [dispatched, delivered, pendingReturns] = await Promise.all([
    q(db.from('orders').select('status', { count: 'exact', head: true }).eq('status', 'DISPATCHED')),
    q(db.from('orders').select('status', { count: 'exact', head: true }).eq('status', 'DELIVERED')),
    q(db.from('returns').select('status', { count: 'exact', head: true })
      .in('status', ['PICKUP_SCHEDULED', 'OUT_FOR_PICKUP'])),
  ]);
  return {
    kpis: {
      orders_dispatched:  dispatched.count,
      orders_delivered:   delivered.count,
      pending_pickups:    pendingReturns.count,
    },
  };
}

// ─── Alerts ───────────────────────────────────────────────────────────────────
export async function getAlerts(db, limit = 10) {
  const half = Math.ceil(limit / 2);

  const [overdueInv, lowStock] = await Promise.all([
    q(db.from('invoices')
      .select('id,invoice_number,total_amount,customer_id')
      .eq('status', 'OVERDUE')
      .order('due_date', { ascending: true })
      .limit(half)),
    q(db.from('inventory_items')
      .select('id,product_id,quantity,reorder_level')
      .filter('quantity', 'lt', 'reorder_level')
      .limit(half)),
  ]);

  const alerts = [
    ...overdueInv.data.map(inv => ({
      type: 'OVERDUE_INVOICE',
      severity: 'high',
      message: `Overdue invoice ${inv.invoice_number}`,
      ref_id: inv.id,
    })),
    ...lowStock.data.map(item => ({
      type: 'LOW_STOCK',
      severity: 'medium',
      message: `Low stock on product ${item.product_id} (qty: ${item.quantity}, min: ${item.reorder_level})`,
      ref_id: item.id,
    })),
  ];

  return { alerts: alerts.slice(0, limit) };
}

// ─── Audit Logs ───────────────────────────────────────────────────────────────
export async function getAuditLogs(db, query) {
  const page  = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 30;
  const from  = (page - 1) * limit;
  const to    = from + limit - 1;

  let req = db
    .from('audit_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (query.search) {
    req = req.or(`action.ilike.%${query.search}%,entity_type.ilike.%${query.search}%`);
  }

  const { data, error, count } = await req;
  if (error) throw Err.fromSupabase(error);
  return { logs: data ?? [], total: count ?? 0, page, limit };
}

// ─── CEO role-prefixed report aliases ─────────────────────────────────────────
export async function getCEORevenue(db) {
  const { data, error } = await db.from('v_revenue_vs_target').select('*');
  if (error) throw Err.fromSupabase(error);
  return { rows: data ?? [] };
}

export async function getCEOCollections(db) {
  const { data, error } = await db.from('mv_collection_efficiency').select('*');
  if (error) throw Err.fromSupabase(error);
  return { rows: data ?? [] };
}

export async function getCEOCustomerRisk(db) {
  const { data, error } = await db.from('mv_risk_scores').select('*').order('risk_score', { ascending: false }).limit(50);
  if (error) throw Err.fromSupabase(error);
  return { rows: data ?? [] };
}

export async function getCEOEmployeeProductivity(db) {
  const { data, error } = await db.from('mv_crem_performance').select('*');
  if (error) throw Err.fromSupabase(error);
  return { rows: data ?? [] };
}
