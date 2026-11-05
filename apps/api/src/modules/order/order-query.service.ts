import { db } from '@bakery/database';
import { customer, customerOrder, orderItem, product, uom } from '@bakery/database/schema';
import { and, desc, eq, sql } from 'drizzle-orm';
import { notFound } from '../../lib/errors';
import type { ListOrdersQuery } from './order.types';

export async function assertOrderExists(orderId: string) {
  const [order] = await db
    .select({ id: customerOrder.id, total: customerOrder.total })
    .from(customerOrder)
    .where(eq(customerOrder.id, orderId))
    .limit(1);
  if (!order) throw notFound('Order tidak ditemukan');
  return order;
}

export async function getOrderById(orderId: string) {
  const [order] = await db
    .select()
    .from(customerOrder)
    .where(eq(customerOrder.id, orderId))
    .limit(1);
  if (!order) throw notFound('Order tidak ditemukan');

  const [cust] = await db
    .select()
    .from(customer)
    .where(eq(customer.id, order.customerId))
    .limit(1);
  const items = await db
    .select({
      id: orderItem.id,
      orderId: orderItem.orderId,
      productId: orderItem.productId,
      quantity: orderItem.quantity,
      uomId: orderItem.uomId,
      unitPrice: orderItem.unitPrice,
      subtotal: orderItem.subtotal,
      statedBudget: orderItem.statedBudget,
      customization: orderItem.customization,
      decorationType: orderItem.decorationType,
      complexityScore: orderItem.complexityScore,
      sizePortion: orderItem.sizePortion,
      tierCount: orderItem.tierCount,
      product: { id: product.id, name: product.name, basePrice: product.basePrice },
      uom: { id: uom.id, name: uom.name, symbol: uom.symbol },
    })
    .from(orderItem)
    .leftJoin(product, eq(orderItem.productId, product.id))
    .leftJoin(uom, eq(orderItem.uomId, uom.id))
    .where(eq(orderItem.orderId, orderId));

  return { ...order, customer: cust ?? null, items };
}

export async function listOrders(query: ListOrdersQuery = {}) {
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.max(1, Math.min(100, query.pageSize ?? 20));
  const conditions = [];
  if (query.status) conditions.push(eq(customerOrder.status, query.status as any));
  if (query.sourceChannel) conditions.push(eq(customerOrder.sourceChannel, query.sourceChannel));
  if (query.customerId) conditions.push(eq(customerOrder.customerId, query.customerId));
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, [{ count }]] = await Promise.all([
    db.select({ order: customerOrder, customer }).from(customerOrder)
      .leftJoin(customer, eq(customerOrder.customerId, customer.id))
      .where(whereClause).orderBy(desc(customerOrder.createdAt)).limit(pageSize).offset((page - 1) * pageSize),
    db.select({ count: sql<number>`count(*)` }).from(customerOrder).where(whereClause),
  ]);

  return {
    data: rows.map((row) => ({ ...row.order, customer: row.customer })),
    pagination: { page, limit: pageSize, total: Number(count) },
  };
}
