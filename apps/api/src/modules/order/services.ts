import { db } from '@bakery/database';
import {
  customer,
  customerOrder,
  orderItem,
  orderReview,
  orderStatusHistory,
  product,
  uom,
} from '@bakery/database/schema';
import { and, desc, eq, sql } from 'drizzle-orm';
import type { CreateOrderWithCustomerInput } from '@bakery/shared-schemas';
import { badRequest, notFound } from '../../lib/errors';
import {
  calculateOrderTotals,
  evaluateScreeningRule,
  generateOrderNumber,
} from './order-utils';

export interface ListOrdersQuery {
  page?: number;
  pageSize?: number;
  status?: string;
  sourceChannel?: string;
  customerId?: string;
}

/**
 * Creates an order along with customer resolution, items calculation, and screening check.
 * All DB operations are wrapped in a transaction.
 */
export async function createOrderWithItems(
  input: CreateOrderWithCustomerInput,
  createdByUserId?: string,
) {
  return await db.transaction(async (tx) => {
    // 1. Customer Resolution
    let resolvedCustomer: typeof customer.$inferSelect;

    if (input.customerId) {
      const [existing] = await tx
        .select()
        .from(customer)
        .where(eq(customer.id, input.customerId))
        .limit(1);
      if (!existing) {
        throw notFound('Customer tidak ditemukan');
      }
      resolvedCustomer = existing;
    } else if (input.customer) {
      let existing: typeof customer.$inferSelect | undefined;

      if (input.customer.phone) {
        const [found] = await tx
          .select()
          .from(customer)
          .where(eq(customer.phone, input.customer.phone))
          .limit(1);
        existing = found;
      }

      if (!existing && input.customer.email) {
        const [found] = await tx
          .select()
          .from(customer)
          .where(eq(customer.email, input.customer.email))
          .limit(1);
        existing = found;
      }

      if (existing) {
        // Update address jika sebelumnya kosong atau berbeda dan baru diberikan
        if (
          input.customer.address &&
          (!existing.address || existing.address !== input.customer.address)
        ) {
          const [updated] = await tx
            .update(customer)
            .set({ address: input.customer.address, updatedAt: new Date() })
            .where(eq(customer.id, existing.id))
            .returning();
          resolvedCustomer = updated;
        } else {
          resolvedCustomer = existing;
        }
      } else {
        const [created] = await tx
          .insert(customer)
          .values({
            name: input.customer.name,
            phone: input.customer.phone || null,
            email: input.customer.email || null,
            address: input.customer.address || null,
          })
          .returning();
        resolvedCustomer = created;
      }
    } else {
      throw badRequest('Informasi customer wajib diisi');
    }

    // 2. Calculate Totals
    const { subtotal, total } = calculateOrderTotals(input.items);

    // 3. Generate Order Number
    const orderNumber = generateOrderNumber();

    // 4. Screening Evaluation
    const reviewReasons: string[] = [];
    for (const item of input.items) {
      const screening = evaluateScreeningRule({
        decorationType: item.decorationType,
        statedBudget: item.statedBudget != null ? item.statedBudget : undefined,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
      });
      if (screening.requiresReview && screening.reason) {
        reviewReasons.push(screening.reason);
      }
    }
    const initialStatus =
      reviewReasons.length > 0 ? ('requires_review' as const) : ('received' as const);

    // 5. Insert Order
    const [newOrder] = await tx
      .insert(customerOrder)
      .values({
        customerId: resolvedCustomer.id,
        orderNumber,
        sourceChannel: input.sourceChannel,
        status: initialStatus,
        fulfillmentDate: input.fulfillmentDate || null,
        fulfillmentTime: input.fulfillmentTime || null,
        deliveryAddress: input.deliveryAddress || null,
        subtotal: subtotal.toFixed(2),
        total: total.toFixed(2),
      })
      .returning();

    // 6. Insert Order Items
    const itemsToInsert = input.items.map((item) => ({
      orderId: newOrder.id,
      productId: item.productId,
      quantity: item.quantity.toString(),
      uomId: item.uomId,
      unitPrice: item.unitPrice.toFixed(2),
      subtotal: (item.quantity * item.unitPrice).toFixed(2),
      statedBudget: item.statedBudget != null ? item.statedBudget.toFixed(2) : null,
      customization: item.customization || null,
      decorationType: item.decorationType,
      complexityScore: item.complexityScore ?? null,
      sizePortion: item.sizePortion ?? null,
      tierCount: item.tierCount ?? 1,
    }));

    const createdItems = await tx.insert(orderItem).values(itemsToInsert).returning();

    // 7. Insert Initial Status History
    await tx.insert(orderStatusHistory).values({
      orderId: newOrder.id,
      oldStatus: null,
      newStatus: initialStatus,
      changedBy: createdByUserId || null,
    });

    // 8. Insert Order Review if requires_review
    if (initialStatus === 'requires_review') {
      const combinedReasons = reviewReasons.join('; ').slice(0, 255);
      await tx.insert(orderReview).values({
        orderId: newOrder.id,
        reason: combinedReasons,
        status: 'pending',
      });
    }

    return {
      ...newOrder,
      customer: resolvedCustomer,
      items: createdItems,
    };
  });
}

/**
 * Retrieves an order by ID with customer and orderItem details.
 */
export async function getOrderById(orderId: string) {
  const [order] = await db
    .select()
    .from(customerOrder)
    .where(eq(customerOrder.id, orderId))
    .limit(1);

  if (!order) {
    throw notFound('Order tidak ditemukan');
  }

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
      product: {
        id: product.id,
        name: product.name,
        basePrice: product.basePrice,
      },
      uom: {
        id: uom.id,
        name: uom.name,
        symbol: uom.symbol,
      },
    })
    .from(orderItem)
    .leftJoin(product, eq(orderItem.productId, product.id))
    .leftJoin(uom, eq(orderItem.uomId, uom.id))
    .where(eq(orderItem.orderId, orderId));

  return {
    ...order,
    customer: cust ?? null,
    items,
  };
}

/**
 * Lists orders with pagination and filtering.
 */
export async function listOrders(query: ListOrdersQuery = {}) {
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.max(1, Math.min(100, query.pageSize ?? 20));
  const offset = (page - 1) * pageSize;

  const conditions = [];
  if (query.status) {
    conditions.push(eq(customerOrder.status, query.status as any));
  }
  if (query.sourceChannel) {
    conditions.push(eq(customerOrder.sourceChannel, query.sourceChannel));
  }
  if (query.customerId) {
    conditions.push(eq(customerOrder.customerId, query.customerId));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, [{ count }]] = await Promise.all([
    db
      .select({
        order: customerOrder,
        customer: customer,
      })
      .from(customerOrder)
      .leftJoin(customer, eq(customerOrder.customerId, customer.id))
      .where(whereClause)
      .orderBy(desc(customerOrder.createdAt))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(customerOrder)
      .where(whereClause),
  ]);

  const data = rows.map((r) => ({
    ...r.order,
    customer: r.customer,
  }));

  return {
    data,
    pagination: {
      page,
      limit: pageSize,
      total: Number(count),
    },
  };
}
