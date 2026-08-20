import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db } from '@bakery/database';
import { user, uom } from '@bakery/database/schema';
import { env } from '../config/env';

// Seed dasar infrastruktur (BUKAN bisnis logic):
// 1. User admin pertama (untuk login)
// 2. UOM default (referensi satuan, dibutuhkan oleh ingredient & recipe)

async function seed(): Promise<void> {
  console.info('[seed] mulai...');

  const existingAdmin = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, env.SEED_ADMIN_EMAIL))
    .limit(1);

  if (existingAdmin[0]) {
    console.info(`[seed] admin sudah ada (${env.SEED_ADMIN_EMAIL}), dilewati`);
  } else {
    const passwordHash = await bcrypt.hash(env.SEED_ADMIN_PASSWORD, 10);
    await db.insert(user).values({
      name: env.SEED_ADMIN_NAME,
      email: env.SEED_ADMIN_EMAIL,
      passwordHash,
      role: 'admin',
    });
    console.info(`[seed] admin dibuat: ${env.SEED_ADMIN_EMAIL} (password: ${env.SEED_ADMIN_PASSWORD})`);
  }

  const defaultUoms: Array<{ name: string; symbol: string; type: string }> = [
    { name: 'Gram', symbol: 'g', type: 'weight' },
    { name: 'Kilogram', symbol: 'kg', type: 'weight' },
    { name: 'Mililiter', symbol: 'ml', type: 'volume' },
    { name: 'Liter', symbol: 'l', type: 'volume' },
    { name: 'Pcs', symbol: 'pcs', type: 'count' },
    { name: 'Lusin', symbol: 'lzn', type: 'count' },
  ];

  for (const u of defaultUoms) {
    const exists = await db.select({ id: uom.id }).from(uom).where(eq(uom.symbol, u.symbol)).limit(1);
    if (exists[0]) continue;
    await db.insert(uom).values(u);
    console.info(`[seed] uom dibuat: ${u.symbol}`);
  }

  console.info('[seed] selesai');
}

await seed();
process.exit(0);