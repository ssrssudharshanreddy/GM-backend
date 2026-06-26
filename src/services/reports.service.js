import * as repo from '../repositories/reports.repository.js';
import { Err } from '../utils/errors.js';

export async function salesSummary(db, query) {
  if (!query.dateFrom || !query.dateTo) throw Err.badRequest('dateFrom and dateTo are required');
  return repo.getSalesSummary(db, query.dateFrom, query.dateTo);
}

export async function revenueVsTarget(db) {
  return repo.getRevenueVsTarget(db);
}

export async function riskScores(db, query) {
  return repo.getRiskScores(db, query);
}

export async function outstandingBalance(db) {
  return repo.getOutstandingBalance(db);
}

export async function topCustomers(db, query) {
  return repo.getTopCustomers(db, query);
}

export async function collectionEfficiency(db) {
  return repo.getCollectionEfficiency(db);
}

export async function cremPerformance(db) {
  return repo.getCremPerformance(db);
}

export async function inventorySummary(db) {
  return repo.getInventorySummary(db);
}

export async function refreshMVs(db) {
  return repo.refreshMaterializedViews(db);
}

export async function getCEODashboard(db) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();

  // 1. Revenue MTD (Verified payments in current month)
  const { data: revMTDRes } = await db
    .from('payments')
    .select('amount')
    .eq('status', 'VERIFIED')
    .gte('created_at', startOfMonth);
  const revenue_mtd = (revMTDRes || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);

  // 2. Revenue Last Month (for delta)
  const { data: revLastMonthRes } = await db
    .from('payments')
    .select('amount')
    .eq('status', 'VERIFIED')
    .gte('created_at', startOfLastMonth)
    .lt('created_at', startOfMonth);
  const revenue_last_month = (revLastMonthRes || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const revenue_delta = revenue_last_month > 0
    ? `${(((revenue_mtd - revenue_last_month) / revenue_last_month) * 100).toFixed(0)}%`
    : '0%';

  // 3. Total Outstanding & Overdue Amount
  const { data: outstandingRes } = await db
    .from('invoices')
    .select('outstanding_amount, status');
  let total_outstanding = 0;
  let overdue_amount = 0;
  for (const inv of outstandingRes || []) {
    if (['UNPAID', 'PARTIALLY_PAID', 'OVERDUE'].includes(inv.status)) {
      total_outstanding += Number(inv.outstanding_amount || 0);
    }
    if (inv.status === 'OVERDUE') {
      overdue_amount += Number(inv.outstanding_amount || 0);
    }
  }

  // 4. Active Customers
  const { count: active_customers } = await db
    .from('customer_profiles')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'ACTIVE');

  // New customers this month
  const { count: new_customers_this_month } = await db
    .from('customer_profiles')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', startOfMonth);

  // 5. Open Orders
  const { count: open_orders } = await db
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .in('status', ['PENDING', 'CONFIRMED', 'PROCESSING', 'PACKED']);

  // 6. Total Employees
  const { count: total_employees } = await db
    .from('employee_profiles')
    .select('*', { count: 'exact', head: true })
    .is('deleted_at', null);

  // 7. Pending Returns
  const { count: pending_returns } = await db
    .from('returns')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'PENDING');

  // 8. Low Stock Count
  const { data: invData } = await db.from('inventory').select('quantity, reorder_threshold');
  const actual_low_stock = (invData || []).filter(item => Number(item.quantity || 0) < Number(item.reorder_threshold || 0)).length;

  return {
    revenue_mtd,
    revenue_delta,
    total_outstanding,
    outstanding_delta: '0%',
    active_customers: active_customers || 0,
    customers_delta: new_customers_this_month || 0,
    open_orders: open_orders || 0,
    total_employees: total_employees || 0,
    overdue_amount,
    pending_returns: pending_returns || 0,
    low_stock_count: actual_low_stock || 0,
  };
}

export async function getCEOFinancials(db) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  // 1. Revenue MTD
  const { data: revMTDRes } = await db
    .from('payments')
    .select('amount')
    .eq('status', 'VERIFIED')
    .gte('created_at', startOfMonth);
  const revenue_mtd = (revMTDRes || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);

  // 2. Outstanding & Overdue Amount
  const { data: outstandingRes } = await db
    .from('invoices')
    .select('outstanding_amount, status');
  let total_outstanding = 0;
  let overdue_amount = 0;
  for (const inv of outstandingRes || []) {
    if (['UNPAID', 'PARTIALLY_PAID', 'OVERDUE'].includes(inv.status)) {
      total_outstanding += Number(inv.outstanding_amount || 0);
    }
    if (inv.status === 'OVERDUE') {
      overdue_amount += Number(inv.outstanding_amount || 0);
    }
  }

  // 3. Credit Exposure
  const { data: creditRes } = await db
    .from('credit_accounts')
    .select('used_credit');
  const credit_exposure = (creditRes || []).reduce((sum, c) => sum + Number(c.used_credit || 0), 0);

  // 4. Revenue By Month
  const { data: monthlyRes } = await db
    .from('payments')
    .select('amount, created_at')
    .eq('status', 'VERIFIED');
  
  const monthlyMap = {};
  for (const p of monthlyRes || []) {
    const m = new Date(p.created_at).toISOString().slice(0, 7);
    monthlyMap[m] = (monthlyMap[m] || 0) + Number(p.amount || 0);
  }
  const revenue_by_month = Object.entries(monthlyMap)
    .map(([month, revenue]) => ({ month, revenue }))
    .sort((a, b) => a.month.localeCompare(b.month));

  // 5. Aging Buckets from v_collection_aging
  const { data: agingRes } = await db
    .from('v_collection_aging')
    .select('aging_bucket, outstanding_amount');
  
  const agingMap = {
    'CURRENT': { amount: 0, count: 0 },
    '1-30': { amount: 0, count: 0 },
    '31-60': { amount: 0, count: 0 },
    '61-90': { amount: 0, count: 0 },
    '90+': { amount: 0, count: 0 }
  };
  for (const item of agingRes || []) {
    const bucket = item.aging_bucket || 'CURRENT';
    if (agingMap[bucket]) {
      agingMap[bucket].amount += Number(item.outstanding_amount || 0);
      agingMap[bucket].count += 1;
    }
  }
  const aging_buckets = Object.entries(agingMap).map(([bucket, val]) => ({
    bucket,
    amount: val.amount,
    count: val.count
  }));

  return {
    kpis: {
      revenue_mtd,
      total_outstanding,
      overdue_amount,
      credit_exposure,
    },
    revenue_by_month,
    aging_buckets,
  };
}

export async function getCEOWarehouse(db) {
  // 1. Inventory Value & Low Stock Count
  const { data: invData } = await db
    .from('inventory')
    .select('quantity, reorder_threshold, products(price)');
  
  let inventory_value = 0;
  let low_stock_count = 0;
  for (const item of invData || []) {
    const price = Number(item.products?.price || 0);
    const qty = Number(item.quantity || 0);
    inventory_value += price * qty;
    if (qty < Number(item.reorder_threshold || 0)) {
      low_stock_count += 1;
    }
  }

  // 2. Pending Allocation
  const { count: pending_allocation } = await db
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'PENDING');

  // 3. Orders In-flight
  const { count: orders_in_flight } = await db
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .in('status', ['CONFIRMED', 'PROCESSING', 'PACKED', 'DISPATCHED']);

  // 4. Dispatched Today
  const startOfToday = new Date();
  startOfToday.setHours(0,0,0,0);
  const { count: dispatched_today } = await db
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'DISPATCHED')
    .gte('dispatched_at', startOfToday.toISOString());

  // 5. Pending Returns
  const { count: pending_returns } = await db
    .from('returns')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'PENDING');

  // Fetch warehouse report data (v_inventory_health) for report page compatibility
  const { data: rows } = await db
    .from('v_inventory_health')
    .select('product_code, product_name, category_name, price, quantity, available_quantity, reorder_threshold')
    .order('product_code', { ascending: true });

  return {
    kpis: {
      inventory_value,
      low_stock_count,
      pending_allocation: pending_allocation || 0,
      orders_in_flight: orders_in_flight || 0,
      dispatched_today: dispatched_today || 0,
      pending_returns: pending_returns || 0,
    },
    data: rows || []
  };
}

export async function getCEOReport(db, reportType) {
  let data = [];
  if (reportType === 'revenue') {
    const { data: rows, error } = await db
      .from('mv_revenue_by_customer')
      .select('company_name, revenue_month, payment_count, gross_revenue, net_revenue')
      .order('revenue_month', { ascending: false });
    if (error) throw Err.fromSupabase(error);
    data = rows || [];
  } else if (reportType === 'collections') {
    const { data: rows, error } = await db
      .from('invoices')
      .select('invoice_number, customer_profiles(company_name), status, total_amount, outstanding_amount, due_date')
      .order('created_at', { ascending: false });
    if (error) throw Err.fromSupabase(error);
    data = (rows || []).map(row => ({
      invoice_number: row.invoice_number,
      company_name: row.customer_profiles?.company_name || '—',
      status: row.status,
      total_amount: row.total_amount,
      outstanding_amount: row.outstanding_amount,
      due_date: row.due_date,
    }));
  } else if (reportType === 'warehouse') {
    const { data: rows, error } = await db
      .from('v_inventory_health')
      .select('product_code, product_name, category_name, price, quantity, available_quantity, reorder_threshold')
      .order('product_code', { ascending: true });
    if (error) throw Err.fromSupabase(error);
    data = rows || [];
  } else if (reportType === 'employee_productivity') {
    const { data: rows, error } = await db
      .from('employee_profiles')
      .select('full_name, role, status, created_at')
      .is('deleted_at', null)
      .order('role', { ascending: true })
      .order('full_name', { ascending: true });
    if (error) throw Err.fromSupabase(error);
    data = rows || [];
  } else if (reportType === 'customer_risk') {
    const { data: rows, error } = await db
      .from('mv_risk_scores')
      .select('company_name, credit_limit, used_credit, risk_score, risk_level')
      .order('risk_score', { ascending: false });
    if (error) throw Err.fromSupabase(error);
    data = rows || [];
  } else {
    throw Err.badRequest('Invalid report type');
  }
  return { data };
}

export async function getAlerts(db) {
  const alerts = [];
  
  // 1. High risk customers
  const { data: riskRes } = await db
    .from('mv_risk_scores')
    .select('company_name, risk_score')
    .gte('risk_score', 70);
  for (const r of riskRes || []) {
    alerts.push({
      alert_type: 'HIGH_RISK_CUSTOMER',
      description: `Customer '${r.company_name}' has a high risk score of ${r.risk_score}.`
    });
  }

  // 2. Low stock items
  const { data: invRes } = await db
    .from('v_inventory_health')
    .select('product_name, available_quantity, reorder_threshold')
    .eq('is_below_threshold', true);
  for (const item of invRes || []) {
    alerts.push({
      alert_type: 'LOW_STOCK',
      description: `Product '${item.product_name}' is below reorder threshold. Available: ${item.available_quantity}, Threshold: ${item.reorder_threshold}.`
    });
  }

  // 3. Overdue invoices
  const { data: overdueRes } = await db
    .from('invoices')
    .select('invoice_number, customer_profiles(company_name), outstanding_amount')
    .eq('status', 'OVERDUE');
  for (const inv of overdueRes || []) {
    alerts.push({
      alert_type: 'OVERDUE_INVOICE',
      description: `Invoice ${inv.invoice_number} for customer '${inv.customer_profiles?.company_name || 'Unknown'}' is OVERDUE. Outstanding: ₹${inv.outstanding_amount}.`
    });
  }

  return { alerts };
}

export async function getAuditLogs(db, query) {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 30;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let q = db
    .from('audit_logs')
    .select('*', { count: 'exact' })
    .range(from, to)
    .order('created_at', { ascending: false });

  if (query.search) {
    q = q.ilike('action', `%${query.search}%`);
  }

  const { data, error, count } = await q;
  if (error) throw Err.fromSupabase(error);
  return {
    logs: data || [],
    total: count || 0,
    pagination: {
      total: count || 0,
      page,
      limit
    }
  };
}

export async function getWSDashboard(db, userId) {
  const startOfToday = new Date();
  startOfToday.setHours(0,0,0,0);
  
  // 1. Assigned Today
  const { count: assigned_today } = await db
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('assigned_ws_id', userId)
    .gte('created_at', startOfToday.toISOString());

  // 2. Delivered Today
  const { count: delivered_today } = await db
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('assigned_ws_id', userId)
    .eq('status', 'DELIVERED')
    .gte('delivered_at', startOfToday.toISOString());

  // 3. In Transit
  const { count: in_transit } = await db
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('assigned_ws_id', userId)
    .eq('status', 'DISPATCHED');

  // 4. Pending Returns
  const { count: pending_returns } = await db
    .from('returns')
    .select('*', { count: 'exact', head: true })
    .eq('assigned_ws_id', userId)
    .eq('status', 'PENDING');

  return {
    kpis: {
      assigned_today: assigned_today || 0,
      delivered_today: delivered_today || 0,
      in_transit: in_transit || 0,
      pending_returns: pending_returns || 0,
    }
  };
}

export async function getWEDashboard(db) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

  // 1. Orders to Process (CONFIRMED)
  const { count: orders_to_process } = await db
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'CONFIRMED');

  // 2. Low Stock Items
  const { data: invData } = await db.from('inventory').select('quantity, reorder_threshold');
  const low_stock_items = (invData || []).filter(item => Number(item.quantity || 0) < Number(item.reorder_threshold || 0)).length;

  // 3. Dispatched Today
  const { count: dispatched_today } = await db
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'DISPATCHED')
    .gte('dispatched_at', startOfToday);

  // 4. Pending Returns
  const { count: pending_returns } = await db
    .from('returns')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'PENDING');

  // 5. Total SKUs
  const { count: total_skus } = await db
    .from('products')
    .select('*', { count: 'exact', head: true })
    .is('deleted_at', null);

  // 6. Inventory Value
  const { data: fullInv } = await db.from('inventory').select('quantity, products(price)');
  const inventory_value = (fullInv || []).reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.products?.price || 0), 0);

  // 7. WS Staff Active
  const { count: ws_staff_active } = await db
    .from('employee_profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'WS')
    .eq('status', 'ACTIVE');

  // 8. Orders Today
  const { count: orders_today } = await db
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', startOfToday);

  return {
    kpis: {
      orders_to_process: orders_to_process || 0,
      low_stock_items: low_stock_items || 0,
      dispatched_today: dispatched_today || 0,
      pending_returns: pending_returns || 0,
      total_skus: total_skus || 0,
      inventory_value,
      ws_staff_active: ws_staff_active || 0,
      orders_today: orders_today || 0,
    }
  };
}

export async function getWESummary(db) {
  // 1. Orders Fulfilled
  const { count: orders_fulfilled } = await db
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'DELIVERED');

  // 2. Returns Processed
  const { count: returns_processed } = await db
    .from('returns')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'RETURN_COMPLETED');

  // 3. Inventory Value & Low Stock Count
  const { data: fullInv } = await db.from('inventory').select('quantity, reorder_threshold, products(price)');
  const inventory_value = (fullInv || []).reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.products?.price || 0), 0);
  const low_stock_count = (fullInv || []).filter(item => Number(item.quantity || 0) < Number(item.reorder_threshold || 0)).length;

  // 4. Order Status Breakdown
  const { data: orderStatus } = await db.from('orders').select('status');
  const statusMap = {};
  for (const o of orderStatus || []) {
    statusMap[o.status] = (statusMap[o.status] || 0) + 1;
  }
  const order_breakdown = Object.entries(statusMap).map(([status, count]) => ({ status, count }));

  // 5. WS Staff Performance
  const { data: staffData } = await db
    .from('employee_profiles')
    .select('id, full_name')
    .eq('role', 'WS')
    .is('deleted_at', null);

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0,0,0,0);

  const ws_performance = [];
  for (const s of staffData || []) {
    const { count } = await db
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('assigned_ws_id', s.id)
      .eq('status', 'DELIVERED')
      .gte('delivered_at', startOfMonth.toISOString());
    ws_performance.push({
      id: s.id,
      full_name: s.full_name,
      deliveries_count: count || 0
    });
  }

  return {
    report: {
      orders_fulfilled: orders_fulfilled || 0,
      returns_processed: returns_processed || 0,
      inventory_value,
      low_stock_count,
      order_breakdown,
      ws_performance,
    }
  };
}

export async function getCREMDashboard(db, userId) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

  // 1. My Customers
  const { count: my_customers } = await db
    .from('customer_profiles')
    .select('*', { count: 'exact', head: true })
    .eq('assigned_crem_id', userId);

  // 2. Active Leads
  const { count: active_leads } = await db
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('created_by_crem_id', userId)
    .not('status', 'in', '("CONVERTED", "LOST")');

  // 3. Visits Today
  const { count: visits_today } = await db
    .from('visits')
    .select('*', { count: 'exact', head: true })
    .eq('crem_id', userId)
    .gte('scheduled_time', startOfToday);

  // 4. Pending Follow Ups
  const { count: pending_follow_ups } = await db
    .from('follow_ups')
    .select('*', { count: 'exact', head: true })
    .eq('crem_id', userId)
    .eq('is_completed', false);

  // 5. Open Tickets
  const { count: open_tickets } = await db
    .from('tickets')
    .select('*', { count: 'exact', head: true })
    .eq('assigned_crem_id', userId)
    .not('status', 'in', '("RESOLVED", "CLOSED")');

  return {
    kpis: {
      my_customers: my_customers || 0,
      active_leads: active_leads || 0,
      visits_today: visits_today || 0,
      pending_follow_ups: pending_follow_ups || 0,
      open_tickets: open_tickets || 0,
      overdue_tasks: 0,
    }
  };
}

export async function getCREMSummary(db, userId) {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0,0,0,0);

  // 1. Customers Managed
  const { count: customers_managed } = await db
    .from('customer_profiles')
    .select('*', { count: 'exact', head: true })
    .eq('assigned_crem_id', userId);

  // 2. Visits this month
  const { count: visits_this_month } = await db
    .from('visits')
    .select('*', { count: 'exact', head: true })
    .eq('crem_id', userId)
    .eq('status', 'COMPLETED')
    .gte('scheduled_time', startOfMonth.toISOString());

  // 3. Follow-Ups done
  const { count: follow_ups_done } = await db
    .from('follow_ups')
    .select('*', { count: 'exact', head: true })
    .eq('crem_id', userId)
    .eq('is_completed', true)
    .gte('created_at', startOfMonth.toISOString());

  // 4. Tickets resolved
  const { count: tickets_resolved } = await db
    .from('tickets')
    .select('*', { count: 'exact', head: true })
    .eq('assigned_crem_id', userId)
    .in('status', ['RESOLVED', 'CLOSED']);

  // 5. Visit by type
  const { data: visits } = await db
    .from('visits')
    .select('visit_type')
    .eq('crem_id', userId);
  const typeMap = {};
  for (const v of visits || []) {
    typeMap[v.visit_type] = (typeMap[v.visit_type] || 0) + 1;
  }
  const visit_by_type = Object.entries(typeMap).map(([type, count]) => ({ type, count }));

  // 6. Lead funnel
  const { data: leads } = await db
    .from('leads')
    .select('status')
    .eq('created_by_crem_id', userId);
  const stageMap = {};
  for (const l of leads || []) {
    stageMap[l.status] = (stageMap[l.status] || 0) + 1;
  }
  const lead_funnel = Object.entries(stageMap).map(([stage, count]) => ({ stage, count }));

  return {
    report: {
      customers_managed: customers_managed || 0,
      visits_this_month: visits_this_month || 0,
      follow_ups_done: follow_ups_done || 0,
      tickets_resolved: tickets_resolved || 0,
      visit_by_type,
      lead_funnel,
    }
  };
}

export async function getCREDashboard(db) {
  // 1. Pending Applications
  const { count: pending_applications } = await db
    .from('customer_applications')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'PENDING_CRE_REVIEW');

  // 2. Portfolio Size
  const { count: portfolio_size } = await db
    .from('customer_profiles')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'ACTIVE');

  // 3. At-Risk Customers
  const { count: at_risk_customers } = await db
    .from('mv_risk_scores')
    .select('*', { count: 'exact', head: true })
    .gte('risk_score', 70);

  // 4. Open Escalations
  const { count: open_escalations } = await db
    .from('tickets')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'ESCALATED');

  // 5. CREMs in Team
  const { count: team_size } = await db
    .from('employee_profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'CREM')
    .is('deleted_at', null);

  return {
    kpis: {
      pending_applications: pending_applications || 0,
      action_required: pending_applications || 0,
      portfolio_size: portfolio_size || 0,
      at_risk_customers: at_risk_customers || 0,
      open_escalations: open_escalations || 0,
      team_size: team_size || 0,
    }
  };
}

export async function getCRESummary(db) {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0,0,0,0);

  // 1. Applications this month
  const { count: applications_this_month } = await db
    .from('customer_applications')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', startOfMonth.toISOString());

  // 2. Application Funnel
  const { data: funnelRes } = await db.from('v_application_funnel').select('status, application_count');
  const funnel = (funnelRes || []).map(f => ({ stage: f.status, count: f.application_count }));

  // 3. Team performance from mv_crem_performance
  const { data: teamRes } = await db.from('mv_crem_performance').select('crem_id, full_name, assigned_customer_count, sla_compliance_pct');
  const team_performance = (teamRes || []).map(member => ({
    id: member.crem_id,
    full_name: member.full_name,
    customer_count: member.assigned_customer_count || 0,
    sla_compliance: Number(member.sla_compliance_pct || 0) / 100
  }));

  return {
    report: {
      applications_this_month: applications_this_month || 0,
      approval_rate: 0.85,
      avg_onboarding_days: 3,
      team_sla_compliance: 0.95,
      funnel,
      team_performance,
    }
  };
}

export async function getAEDashboard(db) {
  // 1. Pending Verifications
  const { count: pending_verifications } = await db
    .from('payments')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'PENDING_VERIFICATION');

  // 2. Total Outstanding & Overdue Invoices
  const { data: outstandingRes } = await db
    .from('invoices')
    .select('outstanding_amount, status');
  let total_outstanding = 0;
  let overdue_invoices = 0;
  for (const inv of outstandingRes || []) {
    if (['UNPAID', 'PARTIALLY_PAID', 'OVERDUE'].includes(inv.status)) {
      total_outstanding += Number(inv.outstanding_amount || 0);
    }
    if (inv.status === 'OVERDUE') {
      overdue_invoices += 1;
    }
  }

  // 3. Pending Applications (APPROVED_CRE_PENDING_AE)
  const { count: pending_applications } = await db
    .from('customer_applications')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'APPROVED_CRE_PENDING_AE');

  // 4. Collected MTD (Verified payments in current month)
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0,0,0,0);
  const { data: revMTDRes } = await db
    .from('payments')
    .select('amount')
    .eq('status', 'VERIFIED')
    .gte('created_at', startOfMonth.toISOString());
  const collected_mtd = (revMTDRes || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);

  // 5. Open Collection Tasks
  const { count: open_collection_tasks } = await db
    .from('collection_tasks')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'PENDING');

  return {
    kpis: {
      pending_verifications: pending_verifications || 0,
      total_outstanding,
      overdue_invoices: overdue_invoices || 0,
      pending_applications: pending_applications || 0,
      collected_mtd,
      open_collection_tasks: open_collection_tasks || 0,
    }
  };
}

export async function getAEOutstanding(db) {
  const { data: invoices } = await db
    .from('invoices')
    .select('outstanding_amount, due_date, status');
  
  let total_outstanding = 0;
  let bucket_30 = 0;
  let bucket_30_plus = 0;
  
  const now = new Date();
  for (const inv of invoices || []) {
    if (['UNPAID', 'PARTIALLY_PAID', 'OVERDUE'].includes(inv.status)) {
      const outstanding = Number(inv.outstanding_amount || 0);
      total_outstanding += outstanding;
      
      const due = new Date(inv.due_date);
      const diffTime = now - due;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays <= 30) {
        bucket_30 += outstanding;
      } else {
        bucket_30_plus += outstanding;
      }
    }
  }

  return {
    kpis: {
      total_outstanding,
      bucket_30,
      bucket_30_plus,
    }
  };
}

export async function getAESummary(db) {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0,0,0,0);

  // 1. Collected MTD
  const { data: revMTDRes } = await db
    .from('payments')
    .select('amount')
    .eq('status', 'VERIFIED')
    .gte('created_at', startOfMonth.toISOString());
  const collected_mtd = (revMTDRes || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);

  // 2. Payments Verified
  const { count: payments_verified } = await db
    .from('payments')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'VERIFIED');

  // 3. Overdue Invoices
  const { count: overdue_invoices } = await db
    .from('invoices')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'OVERDUE');

  // 4. Aging
  const { data: agingRes } = await db
    .from('v_collection_aging')
    .select('aging_bucket, outstanding_amount');
  
  const agingMap = {
    'CURRENT': { amount: 0, count: 0 },
    '1-30': { amount: 0, count: 0 },
    '31-60': { amount: 0, count: 0 },
    '61-90': { amount: 0, count: 0 },
    '90+': { amount: 0, count: 0 }
  };
  for (const item of agingRes || []) {
    const bucket = item.aging_bucket || 'CURRENT';
    if (agingMap[bucket]) {
      agingMap[bucket].amount += Number(item.outstanding_amount || 0);
      agingMap[bucket].count += 1;
    }
  }
  const aging = Object.entries(agingMap).map(([bucket, val]) => ({
    bucket,
    amount: val.amount,
    count: val.count
  }));

  // 5. Payment Methods
  const { data: payments } = await db
    .from('payments')
    .select('payment_mode, amount')
    .eq('status', 'VERIFIED');
  
  const methodMap = {};
  for (const p of payments || []) {
    methodMap[p.payment_mode] = methodMap[p.payment_mode] || { amount: 0, count: 0 };
    methodMap[p.payment_mode].amount += Number(p.amount || 0);
    methodMap[p.payment_mode].count += 1;
  }
  const payment_methods = Object.entries(methodMap).map(([method, val]) => ({
    method,
    amount: val.amount,
    count: val.count
  }));

  return {
    report: {
      collected_mtd,
      payments_verified: payments_verified || 0,
      collection_rate: 0.85,
      overdue_invoices: overdue_invoices || 0,
      aging,
      payment_methods,
    }
  };
}
