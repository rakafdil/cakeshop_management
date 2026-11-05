import { db } from '@bakery/database';
import { customerOrder, orderStatusHistory, user } from '@bakery/database/schema';
import { desc, eq } from 'drizzle-orm';
import { badRequest, notFound } from '../../lib/errors';
import { consumeOrderIngredients } from '../production/stock.service';
import { VALID_ORDER_STATUSES, type ValidOrderStatus } from './order.types';

export async function updateOrderStatus(orderId: string, newStatus: string, changedByUserId?: string) {
  if (!VALID_ORDER_STATUSES.includes(newStatus as ValidOrderStatus)) {
    throw badRequest('Status order tidak valid');
  }

  return await db.transaction(async (tx) => {
    const [order] = await tx.select().from(customerOrder)
      .where(eq(customerOrder.id, orderId))
      .for('update')
      .limit(1);
    if (!order) throw notFound('Order tidak ditemukan');
    if (order.status === 'requires_review' && newStatus === 'in_production') {
      throw badRequest('Order requires review approval before production');
    }
    if (order.status !== 'in_production' && newStatus === 'in_production') {
      await consumeOrderIngredients(tx, orderId);
    }

    const [updatedOrder] = await tx.update(customerOrder)
      .set({ status: newStatus as ValidOrderStatus, updatedAt: new Date() })
      .where(eq(customerOrder.id, orderId)).returning();
    await tx.insert(orderStatusHistory).values({
      orderId,
      oldStatus: order.status,
      newStatus: newStatus as ValidOrderStatus,
      changedBy: changedByUserId || null,
    });
    return updatedOrder;
  });
}

export async function getOrderStatusHistory(orderId: string) {
  const [order] = await db.select({ id: customerOrder.id }).from(customerOrder)
    .where(eq(customerOrder.id, orderId)).limit(1);
  if (!order) throw notFound('Order tidak ditemukan');

  const rows = await db.select({
    id: orderStatusHistory.id,
    orderId: orderStatusHistory.orderId,
    oldStatus: orderStatusHistory.oldStatus,
    newStatus: orderStatusHistory.newStatus,
    changedAt: orderStatusHistory.changedAt,
    changedBy: orderStatusHistory.changedBy,
    userName: user.name,
    userEmail: user.email,
  }).from(orderStatusHistory)
    .leftJoin(user, eq(orderStatusHistory.changedBy, user.id))
    .where(eq(orderStatusHistory.orderId, orderId))
    .orderBy(desc(orderStatusHistory.changedAt));

  return rows.map((row) => ({
    ...row,
    user: row.changedBy && row.userName ? { name: row.userName, email: row.userEmail } : null,
  }));
}
