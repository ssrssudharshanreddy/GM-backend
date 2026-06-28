import { Err } from '../utils/errors.js';
import { getPagination } from '../utils/pagination.js';

const TICKET_SELECT = `
  id, ticket_number, customer_id, category, subject, status,
  assigned_crem_id, escalated_to, escalation_reason,
  created_at, updated_at,
  customer_profiles(company_name, contact_person, phone),
  employee_profiles!assigned_crem_id(full_name)
`;

export async function findAll(db, query) {
  const { from, to } = getPagination(query);
  let q = db
    .from('tickets')
    .select(TICKET_SELECT, { count: 'exact' })
    .range(from, to)
    .order('created_at', { ascending: false });
  if (query.status)           q = q.eq('status', query.status);
  if (query.category)         q = q.eq('category', query.category);
  if (query.customer_id)      q = q.eq('customer_id', query.customer_id);
  if (query.assigned_crem_id) q = q.eq('assigned_crem_id', query.assigned_crem_id);
  const { data, error, count } = await q;
  if (error) throw Err.fromSupabase(error);
  return { data, count };
}

export async function findById(db, id) {
  const { data, error } = await db
    .from('tickets')
    .select(`${TICKET_SELECT}, ticket_messages(*)`)
    .eq('id', id)
    .maybeSingle();
  if (error) throw Err.fromSupabase(error);

  if (data && data.ticket_messages && data.ticket_messages.length > 0) {
    const senderIds = [...new Set(data.ticket_messages.map(m => m.sender_id))];
    const [{ data: employees }, { data: customers }] = await Promise.all([
      db.from('employee_profiles').select('id, full_name').in('id', senderIds),
      db.from('customer_profiles').select('id, company_name').in('id', senderIds)
    ]);
    
    const profiles = {};
    if (employees) employees.forEach(e => profiles[e.id] = { full_name: e.full_name });
    if (customers) customers.forEach(c => profiles[c.id] = { company_name: c.company_name });
    
    data.ticket_messages = data.ticket_messages.map(m => {
      const p = profiles[m.sender_id] || {};
      return {
        ...m,
        employee_profiles: p.full_name ? { full_name: p.full_name } : null,
        customer_profiles: p.company_name ? { company_name: p.company_name } : null
      };
    });
  }

  return data;
}

export async function create(db, payload) {
  const { data, error } = await db.from('tickets').insert(payload).select().single();
  if (error) throw Err.fromSupabase(error);
  return data;
}

export async function update(db, id, payload) {
  const { data, error } = await db.from('tickets').update(payload).eq('id', id).select().single();
  if (error) throw Err.fromSupabase(error);
  return data;
}

export async function addMessage(db, payload) {
  const { data, error } = await db.from('ticket_messages').insert(payload).select().single();
  if (error) throw Err.fromSupabase(error);
  return data;
}
