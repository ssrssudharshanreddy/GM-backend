import 'dotenv/config';
import pg from 'pg';
import fs from 'fs';
import path from 'path';

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DIRECT_URL or DATABASE_URL is missing from .env!');
  process.exit(1);
}

const client = new pg.Client({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

const seedEmails = [
  'ceo@gangamaxx.com',
  'cre@gangamaxx.com',
  'cre1@gangamaxx.com',
  'cre2@gangamaxx.com',
  'crem1@gangamaxx.com',
  'crem2@gangamaxx.com',
  'crem3@gangamaxx.com',
  'ae@gangamaxx.com',
  'we@gangamaxx.com',
  'ws1@gangamaxx.com',
  'ws2@gangamaxx.com',
  'buyer1@cleanhotel.com',
  'procurement@citymedical.com',
  'admin@greenpark.com'
];

async function runSeed() {
  try {
    console.log('Connecting to PostgreSQL database directly...');
    await client.connect();
    console.log('✅ Connected successfully.');

    console.log('Clearing any conflicting users from auth.users to avoid unique constraint violations...');
    const deleteQuery = `DELETE FROM auth.users WHERE email = ANY($1)`;
    const deleteRes = await client.query(deleteQuery, [seedEmails]);
    console.log(`✅ Deleted conflicting users (count: ${deleteRes.rowCount})`);

    const seedPath = path.resolve('../database/seed.sql');
    console.log(`Reading seed SQL file from: ${seedPath}`);
    
    if (!fs.existsSync(seedPath)) {
      console.error(`❌ Seed file does not exist at ${seedPath}`);
      process.exit(1);
    }

    const sql = fs.readFileSync(seedPath, 'utf8');
    console.log('Executing seed script (this may take a few seconds)...');

    // Run the entire seed script
    await client.query(sql);

    console.log('✅ Database seeded successfully with all initial users, products, categories, and test workflows!');
  } catch (err) {
    console.error('❌ Error executing seed script:', err.message);
    if (err.detail) console.error('Details:', err.detail);
  } finally {
    await client.end();
  }
}

runSeed();
