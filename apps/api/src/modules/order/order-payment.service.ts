import { db } from '@bakery/database';
import { customerOrder, payment } from '@bakery/database/schema';
import { desc, eq } from 'drizzle-orm';
import type { RecordPaymentInput } from './order.types';
import { assertOrderExists } from './order-query.service';

export async function recordOrderPayment(orderId: string, data: RecordPaymentInput) {
  await assertOrderExists(orderId);
  const status = data.status ?? 'verified';
  const [newPayment] = await db.insert(payment).values({
    orderId,
    amount: data.amount.toFixed(2),
    paymentMethod: data.paymentMethod,
    proofUrl: data.proofUrl ?? null,
    status,
    paidAt: status === 'verified' ? new Date() : null,
  }).returning();
  return newPayment;
}

export async function getOrderPaymentsSummary(orderId: string) {
  const order = await assertOrderExists(orderId);
  const payments = await db.select().from(payment)
    .where(eq(payment.orderId, orderId)).orderBy(desc(payment.createdAt));
  const totalOrder = Number(order.total);
  const totalPaid = Math.round(
    payments.filter((item) => item.status === 'verified')
      .reduce((sum, item) => sum + Number(item.amount), 0) * 100,
  ) / 100;
  const balanceDue = Math.max(0, Math.round((totalOrder - totalPaid) * 100) / 100);
  return { data: payments, summary: { totalOrder, totalPaid, balanceDue } };
}
