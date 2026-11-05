import { db } from '@bakery/database';
import { customer } from '@bakery/database/schema';
import { eq } from 'drizzle-orm';
import type { CreateOrderWithCustomerInput } from '@bakery/shared-schemas';
import { badRequest, notFound } from '../../lib/errors';

export type OrderTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function resolveCustomer(
  tx: OrderTransaction,
  input: CreateOrderWithCustomerInput,
): Promise<typeof customer.$inferSelect> {
  if (input.customerId) {
    const [existing] = await tx
      .select()
      .from(customer)
      .where(eq(customer.id, input.customerId))
      .limit(1);
    if (!existing) throw notFound('Customer tidak ditemukan');
    return existing;
  }

  if (!input.customer) {
    throw badRequest('Informasi customer wajib diisi');
  }

  const existing = await findExistingCustomer(tx, input.customer.phone, input.customer.email);
  if (existing) {
    if (
      input.customer.address &&
      (!existing.address || existing.address !== input.customer.address)
    ) {
      const [updated] = await tx
        .update(customer)
        .set({ address: input.customer.address, updatedAt: new Date() })
        .where(eq(customer.id, existing.id))
        .returning();
      return updated;
    }
    return existing;
  }

  const [created] = await tx
    .insert(customer)
    .values({
      name: input.customer.name,
      phone: input.customer.phone || null,
      email: input.customer.email || null,
      address: input.customer.address || null,
    })
    .returning();
  return created;
}

async function findExistingCustomer(
  tx: OrderTransaction,
  phone?: string | null,
  email?: string | null,
) {
  if (phone) {
    const [found] = await tx
      .select()
      .from(customer)
      .where(eq(customer.phone, phone))
      .limit(1);
    if (found) return found;
  }

  if (email) {
    const [found] = await tx
      .select()
      .from(customer)
      .where(eq(customer.email, email))
      .limit(1);
    return found;
  }

  return undefined;
}
