import pg from 'pg';

const client = new pg.Client({connectionString: 'postgresql://postgres.lrrjkdxntsdnmbtntepx:GangaMaxx@18@aws-1-ap-south-1.pooler.supabase.com:5432/postgres'});
await client.connect();

try {
  // Backfill last_payment_date
  await client.query(`
    UPDATE credit_accounts ca
    SET last_payment_date = (
      SELECT MAX(payment_date) FROM payments p 
      WHERE p.customer_id = ca.customer_id AND p.status = 'VERIFIED'
    )
    WHERE EXISTS (
      SELECT 1 FROM payments p WHERE p.customer_id = ca.customer_id AND p.status = 'VERIFIED'
    );
  `);
  
  // Re-calculate used_credit based on outstanding invoices? 
  // Actually, we can just subtract the total verified payments from used_credit if it hasn't been done yet.
  // Wait, used_credit is currently exactly equal to the total of the invoice. 
  // Let's just fix it for the verified payments we have so far.
  await client.query(`
    UPDATE credit_accounts ca
    SET used_credit = GREATEST(0, used_credit - COALESCE((
      SELECT SUM(amount) FROM payments p 
      WHERE p.customer_id = ca.customer_id AND p.status = 'VERIFIED'
    ), 0))
    WHERE EXISTS (
      SELECT 1 FROM payments p WHERE p.customer_id = ca.customer_id AND p.status = 'VERIFIED'
    );
  `);
  
  console.log('Successfully backfilled credit_accounts.');
} catch (e) {
  console.error('Failed to backfill:', e);
} finally {
  await client.end();
}
