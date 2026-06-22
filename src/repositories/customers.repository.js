import { Err } from '../utils/errors.js';
import { getPagination } from '../utils/pagination.js';

const CUSTOMER_SELECT = `
  id, company_name, contact_person, phone, alternate_phone, email,
  gst_number, pan_number, status, assigned_crem_id,
  address_line1, address_line2, city, state, pincode,
  business_type, annual_turnover,
  created_at, updated_at
`;

export async function findAll(db, query) {
  const { from, to } = getPagination(query);
  let q = db
    .from('customer_profiles')
    .select(CUSTOMER_SELECT + ', credit_accounts(credit_limit, used_credit, is_frozen)', { count: 'exact' })
    .range(from, to)
    .order('created_at', { ascending: false });

  if (query.status)           q = q.eq('status', query.status);
  if (query.assigned_crem_id) q = q.eq('assigned_crem_id', query.assigned_crem_id);
  if (query.search)           q = q.ilike('company_name', `%${query.search}%`);

  const { data, error, count } = await q;
  if (error) throw Err.fromSupabase(error);
  return { data, count };
}

export async function findById(db, id) {
  const { data, error } = await db
    .from('customer_profiles')
    .select(CUSTOMER_SELECT + ', credit_accounts(*)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw Err.fromSupabase(error);
  return data;
}

export async function create(db, payload) {
  const { data, error } = await db
    .from('customer_profiles')
    .insert(payload)
    .select()
    .single();
  if (error) throw Err.fromSupabase(error);
  return data;
}

export async function update(db, id, payload) {
  const { data, error } = await db
    .from('customer_profiles')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw Err.fromSupabase(error);
  return data;
}

export async function findApplications(db, customerId) {
  const { data, error } = await db
    .from('customer_applications')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });
  if (error) throw Err.fromSupabase(error);
  return data;
}

export async function findAllApplications(db, query) {
  const { from, to } = getPagination(query);
  let q = db
    .from('customer_applications')
    .select('*, customer_profiles(company_name, contact_person)', { count: 'exact' })
    .range(from, to)
    .order('created_at', { ascending: false });

  if (query.status) q = q.eq('status', query.status);

  const { data, error, count } = await q;
  if (error) throw Err.fromSupabase(error);
  return { data, count };
}

export async function findApplicationById(db, id) {
  const { data, error } = await db
    .from('customer_applications')
    .select('*, customer_profiles(company_name), customer_documents(*)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw Err.fromSupabase(error);
  return data;
}

export async function updateApplication(db, id, payload) {
  const { data, error } = await db
    .from('customer_applications')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw Err.fromSupabase(error);
  return data;
}

export async function findDocuments(db, customerId) {
  const { data, error } = await db
    .from('customer_documents')
    .select('*')
    .eq('customer_id', customerId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (error) throw Err.fromSupabase(error);
  return data;
}

export async function insertDocument(db, payload) {
  const { data, error } = await db
    .from('customer_documents')
    .insert(payload)
    .select()
    .single();
  if (error) throw Err.fromSupabase(error);
  return data;
}

export async function deleteDocument(db, id, uploaderId) {
  const { error } = await db
    .from('customer_documents')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw Err.fromSupabase(error);
}
