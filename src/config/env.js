import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),

  // Supabase
  SUPABASE_URL: z.string().url(),
  SUPABASE_JWKS_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // Storage buckets
  SUPABASE_STORAGE_BUCKET_PROFILE: z.string().default('profile-images'),
  SUPABASE_STORAGE_BUCKET_INVOICES: z.string().default('invoice-pdfs'),
  SUPABASE_STORAGE_BUCKET_TICKETS: z.string().default('ticket-attachments'),
  SUPABASE_STORAGE_BUCKET_PRODUCTS: z.string().default('product-images'),
  SUPABASE_STORAGE_BUCKET_RETURNS: z.string().default('return-proofs'),
  SUPABASE_STORAGE_BUCKET_DELIVERY: z.string().default('delivery-proofs'),
  SUPABASE_STORAGE_BUCKET_DOCS: z.string().default('customer-documents'),
  // CORS
  CORS_ORIGINS: z
  
    .string()
    .default('http://localhost:5173')
    .transform((s) => s.split(',').map((o) => o.trim())),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const missing = parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`);
  console.error('❌  Missing / invalid environment variables:\n' + missing.join('\n'));
  process.exit(1);
}

export const env = parsed.data;
