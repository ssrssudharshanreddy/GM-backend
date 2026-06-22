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
    .select(`${TICKET_SELECT}, ticket_messages(*, employee_profiles!sender_id(full_name), customer_profiles!sender_id(company_name))`)
    .eq('id', id)
    .maybeSingle();
  if (error) throw Err.fromSupabase(error);
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
