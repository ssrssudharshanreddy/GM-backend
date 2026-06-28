import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const RETURN_SELECT = `
  id, return_number, customer_id, order_id, status, return_type, notes, proof_urls,
  pickup_scheduled_date, assigned_ws_id, rejection_reason,
  created_at, updated_at,
  customer_profiles(company_name, contact_person_name, contact_phone, delivery_address),
  orders(order_number, delivery_address),
  return_items(
    id, order_item_id, product_id, quantity, reason, outcome, outcome_notes,
    products(name, product_code, unit)
  )
`;

db.from('returns').select(RETURN_SELECT).limit(1).then(res => {
  if (res.error) console.error('Supabase Error:', res.error);
  else console.log('Success!', res.data.length);
}).catch(console.error);
