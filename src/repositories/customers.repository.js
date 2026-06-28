import { Err } from '../utils/errors.js';
import { getPagination } from '../utils/pagination.js';

const CUSTOMER_SELECT = `
  id, company_name, contact_person, phone, alternate_phone, email,
  gst_number, pan_number, status, assigned_crem_id,
  address_line1, address_line2, city, state, pincode,
  business_type, annual_turnover,
  created_at, updated_at,
  assigned_crem:employee_profiles!assigned_crem_id(full_name)
`;

/** Flatten nested Supabase joins into a clean customer object */
function mapCustomer(row) {
  if (!row) return null;
  const { assigned_crem, credit_accounts, ...rest } = row;

  // Alias gst_number → gstin for frontend compatibility
  rest.gstin = rest.gst_number;

  // Flatten CREM name
  rest.crem_name = assigned_crem?.full_name ?? null;

  // Flatten credit_accounts (one-to-one; Supabase returns an array)
  const ca = Array.isArray(credit_accounts) ? credit_accounts[0] : credit_accounts;
  rest.credit_limit      = ca?.credit_limit      ?? 0;
  rest.used_credit       = ca?.used_credit        ?? 0;
  rest.credit_days       = ca?.credit_days        ?? null;
  rest.payment_terms     = ca?.payment_terms      ?? null;
  rest.is_frozen         = ca?.is_frozen          ?? false;
  rest.outstanding_amount = ca?.used_credit       ?? 0; // outstanding = used_credit (unpaid balance)
  rest.last_payment_date  = ca?.last_payment_date ?? null;

  return rest;
}

export async function findAll(db, query) {
  const { from, to } = getPagination(query);
  let q = db
    .from('customer_profiles')
    .select(CUSTOMER_SELECT + ', credit_accounts(credit_limit, used_credit, credit_days, is_frozen, last_payment_date)', { count: 'exact' })
    .range(from, to)
    .order('created_at', { ascending: false });

  if (query.status)           q = q.eq('status', query.status);
  if (query.assigned_crem_id) q = q.eq('assigned_crem_id', query.assigned_crem_id);
  if (query.my_customers && query.my_customers !== 'false') {
    // CREM sees only their assigned customers (RLS also enforces this)
  }
  if (query.search)           q = q.ilike('company_name', `%${query.search}%`);
  if (query.overdue === 'true') {
    // Filter customers who have at least one OVERDUE invoice
    const { data: overdueInvoices } = await db.from('invoices').select('customer_id').eq('status', 'OVERDUE');
    const overdueCustomerIds = [...new Set((overdueInvoices || []).map(i => i.customer_id))];
    if (overdueCustomerIds.length === 0) {
      return { data: [], count: 0 };
    }
    q = q.in('id', overdueCustomerIds);
  }

  const { data, error, count } = await q;
  if (error) throw Err.fromSupabase(error);
  const mapped = (data || []).map(mapCustomer);
  await Promise.all(mapped.map(async c => {
    const { data: orderData } = await db.from('orders')
      .select('created_at')
      .eq('customer_id', c.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    c.last_order_date = orderData?.created_at || null;
    
    if (query.overdue === 'true') {
      const { data: agingData } = await db.from('v_collection_aging')
        .select('days_overdue')
        .eq('customer_id', c.id)
        .order('days_overdue', { ascending: false })
        .limit(1)
        .maybeSingle();
      c.overdue_days = agingData?.days_overdue || 0;
    }
  }));
  
  return { data: mapped, count };
}

export async function findById(db, id) {
  const { data, error } = await db
    .from('customer_profiles')
    .select(CUSTOMER_SELECT + ', credit_accounts(*)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw Err.fromSupabase(error);
  const c = mapCustomer(data);
  if (c) {
    const { data: orderData } = await db.from('orders')
      .select('created_at')
      .eq('customer_id', c.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    c.last_order_date = orderData?.created_at || null;
  }
  return c;
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
    .select('*, customer_profiles(company_name, contact_person, gst_number)', { count: 'exact' })
    .range(from, to)
    .order('created_at', { ascending: false });

  if (query.status) q = q.eq('status', query.status);

  const { data, error, count } = await q;
  if (error) throw Err.fromSupabase(error);
  
  const mappedData = (data || []).map(app => {
    const { customer_profiles: cp, ...rest } = app;
    if (cp) {
      rest.company_name = cp.company_name;
      rest.contact_person = cp.contact_person;
      rest.gstin = cp.gst_number;
    }
    return rest;
  });

  return { data: mappedData, count };
}

export async function findApplicationById(db, id) {
  const { data, error } = await db
    .from('customer_applications')
    .select(`
      *,
      customer_profiles(
        company_name, contact_person, email, phone, alternate_phone,
        gst_number, pan_number, city, state, pincode,
        address_line1, address_line2, business_type, annual_turnover
      ),
      customer_documents(*)
    `)
    .eq('id', id)
    .maybeSingle();
  if (error) throw Err.fromSupabase(error);
  if (!data) return null;

  // Flatten customer_profiles fields onto the application object
  const { customer_profiles: cp, ...rest } = data;
  if (cp) {
    rest.company_name   = cp.company_name;
    rest.contact_person = cp.contact_person;
    rest.email          = cp.email;
    rest.phone          = cp.phone;
    rest.alternate_phone = cp.alternate_phone;
    rest.gstin          = cp.gst_number;
    rest.gst_number     = cp.gst_number;
    rest.pan_number     = cp.pan_number;
    rest.city           = cp.city;
    rest.state          = cp.state;
    rest.pincode        = cp.pincode;
    rest.address_line1  = cp.address_line1;
    rest.address_line2  = cp.address_line2;
    rest.business_type  = cp.business_type;
    rest.annual_turnover = cp.annual_turnover;
  }
  return rest;
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
