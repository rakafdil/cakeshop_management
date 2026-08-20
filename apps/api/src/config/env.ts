import { z } from 'zod';

const boolFromString = z
  .enum(['true', 'false'])
  .default('false')
  .transform((v) => v === 'true');

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  HOST: z.string().default('0.0.0.0'),

  DATABASE_URL: z
    .string()
    .default('postgres://user:password@localhost:5432/cakeshop'),

  // Auth — JWT disimpan di httpOnly cookie
  JWT_SECRET: z.string().min(16).default('dev-only-secret-change-in-production'),
  JWT_EXPIRES_IN_DAYS: z.coerce.number().default(7),
  COOKIE_SECURE: boolFromString,
  CORS_ORIGIN: z.string().default('http://localhost:3000'),

  // Rate limit
  RATE_LIMIT_MAX: z.coerce.number().default(300),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60_000),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().default(10),
  AUTH_RATE_LIMIT_WINDOW_MS: z.coerce.number().default(15 * 60_000),

  // Seed
  SEED_ADMIN_EMAIL: z.string().email().default('admin@cakeshop.local'),
  SEED_ADMIN_PASSWORD: z.string().min(8).default('admin1234'),
  SEED_ADMIN_NAME: z.string().default('Admin Cakeshop'),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('[env] Konfigurasi environment tidak valid:');
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;
export const corsOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim());