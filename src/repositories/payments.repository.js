import { Err } from '../utils/errors.js';
import { getPagination } from '../utils/pagination.js';

const PAYMENT_SELECT = `
  id, invoice_id, customer_id, amount, payment_mode, payment_date,
  reference_number, cheque_number, bank_name, status, remarks,
  verified_by, verified_at, rejection_reason,
  dishonored_at, dishonor_reason,
  created_at, updated_at,
  customer_profiles(company_name),
  invoices(invoice_number, total_amount)
`;

export async function findAll(db, query) {
  const { from, to } = getPagination(query);
  let q = db
    .from('payments')
    .select(PAYMENT_SELECT, { count: 'exact' })
    .range(from, to)
    .order('created_at', { ascending: false });

  if (query.status)      q = q.eq('status', query.status);
  if (query.customer_id) q = q.eq('customer_id', query.customer_id);
  if (query.dateFrom)    q = q.gte('payment_date', query.dateFrom);
  if (query.dateTo)      q = q.lte('payment_date', query.dateTo);

  const { data, error, count } = await q;
  if (error) throw Err.fromSupabase(error);
  return { data, count };
}

export async function findById(db, id) {
  const { data, error } = await db.from('payments').select(PAYMENT_SELECT).eq('id', id).maybeSingle();
  if (error) throw Err.fromSupabase(error);
  return data;
}

export async function create(db, payload) {
  const { data, error } = await db.from('payments').insert(payload).select().single();
  if (error) throw Err.fromSupabase(error);
  return data;
}

export async function update(db, id, payload) {
  const { data, error } = await db.from('payments').update(payload).eq('id', id).select().single();
  if (error) throw Err.fromSupabase(error);
  return data;
}

export async function uploadReceipt(db, paymentId, fileUrl, fileName, mimeType, uploadedBy) {
  const { data, error } = await db
    .from('payment_receipts')
    .insert({ payment_id: paymentId, file_url: fileUrl, file_name: fileName, file_mime_type: mimeType, uploaded_by: uploadedBy })
    .select()
    .single();
  if (error) throw Err.fromSupabase(error);
  return data;
}
