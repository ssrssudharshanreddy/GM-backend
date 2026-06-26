import { Err } from '../utils/errors.js';
import { getPagination } from '../utils/pagination.js';

const INVOICE_SELECT = `
  id, invoice_number, customer_id, order_id, status,
  subtotal, total_gst, total_amount, outstanding_amount,
  due_date, paid_at,
  created_at, updated_at,
  customer_profiles(company_name, contact_person, phone, gst_number, address_line1, city, state, pincode),
  orders(
    order_number,
    order_items(
      id, product_id, quantity, unit_price, gst_rate, gst_amount, line_total,
      products(name, product_code, unit)
    )
  )
`;

function mapInvoice(invoice) {
  if (!invoice) return null;
  const mapped = { ...invoice };
  if (invoice.customer_profiles) {
    mapped.company_name   = invoice.customer_profiles.company_name;
    mapped.contact_person = invoice.customer_profiles.contact_person;
    mapped.phone          = invoice.customer_profiles.phone;
    mapped.gst_number     = invoice.customer_profiles.gst_number;
    mapped.address_line1  = invoice.customer_profiles.address_line1;
    mapped.city           = invoice.customer_profiles.city;
    mapped.state          = invoice.customer_profiles.state;
    mapped.pincode        = invoice.customer_profiles.pincode;
  }
  if (invoice.orders) {
    mapped.order_number = invoice.orders.order_number;
    // Flatten product details onto each line item
    mapped.items = (invoice.orders.order_items || []).map(item => ({
      ...item,
      product_name: item.products?.name       ?? item.product_name ?? '—',
      product_code: item.products?.product_code ?? item.product_code ?? '',
      unit:         item.products?.unit         ?? item.unit ?? '',
      total_amount: item.line_total,
    }));
  } else {
    mapped.order_number = null;
    mapped.items = [];
  }

  // Normalise numeric amounts — DB stores as subtotal / total_gst / outstanding_amount
  const totalAmount    = Number(invoice.total_amount    || 0);
  const subtotal       = Number(invoice.subtotal        || 0);
  const totalGst       = Number(invoice.total_gst       || 0);
  const outstanding    = Number(invoice.outstanding_amount || 0);
  const paidAmount     = totalAmount - outstanding;

  mapped.subtotal_amount = subtotal;
  mapped.gst_amount      = totalGst;
  mapped.paid_amount     = paidAmount;
  mapped.total_amount    = totalAmount;
  mapped.outstanding_amount = outstanding;

  // Legacy aliases
  mapped.issue_date    = invoice.created_at;
  mapped.invoice_date  = invoice.created_at;
  mapped.amount_paid   = paidAmount;
  mapped.amount_due    = outstanding;
  mapped.tax_amount    = totalGst;

  return mapped;
}

export async function findAll(db, query) {
  const { from, to } = getPagination(query);
  let q = db
    .from('invoices')
    .select(INVOICE_SELECT, { count: 'exact' })
    .range(from, to)
    .order('created_at', { ascending: false });

  if (query.status) {
    const statuses = query.status.split(',');
    if (statuses.length > 1) {
      q = q.in('status', statuses);
    } else {
      q = q.eq('status', query.status);
    }
  }
  if (query.customer_id) q = q.eq('customer_id', query.customer_id);
  if (query.dateFrom)    q = q.gte('issue_date', query.dateFrom);
  if (query.dateTo)      q = q.lte('issue_date', query.dateTo);

  const { data, error, count } = await q;
  if (error) throw Err.fromSupabase(error);
  return { data: (data || []).map(mapInvoice), count };
}

export async function findById(db, id) {
  const { data, error } = await db
    .from('invoices')
    .select(INVOICE_SELECT)
    .eq('id', id)
    .maybeSingle();
  if (error) throw Err.fromSupabase(error);
  return mapInvoice(data);
}

export async function findOverdue(db, query) {
  const { from, to } = getPagination(query);
  const { data, error, count } = await db
    .from('invoices')
    .select(INVOICE_SELECT, { count: 'exact' })
    .in('status', ['UNPAID', 'PARTIALLY_PAID', 'OVERDUE'])
    .lt('due_date', new Date().toISOString())
    .range(from, to)
    .order('due_date');
  if (error) throw Err.fromSupabase(error);
  return { data: (data || []).map(mapInvoice), count };
}

