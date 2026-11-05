import { db } from '@bakery/database';
import { customerOrder, orderItem, orderReview, orderStatusHistory } from '@bakery/database/schema';
import type { CreateOrderWithCustomerInput } from '@bakery/shared-schemas';
import { calculateOrderTotals, evaluateScreeningRule, generateOrderNumber } from './order-utils';
import { resolveCustomer, type OrderTransaction } from './order-customer';

function screenItems(items: CreateOrderWithCustomerInput['items']) {
  const reviewReasons: string[] = [];
  for (const item of items) {
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

  return {
    reviewReasons,
    initialStatus: reviewReasons.length > 0 ? ('requires_review' as const) : ('received' as const),
  };
}

function buildOrderItemRows(
  orderId: string,
  items: CreateOrderWithCustomerInput['items'],
) {
  return items.map((item) => ({
    orderId,
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
}

export async function createOrderWithItems(
  input: CreateOrderWithCustomerInput,
  createdByUserId?: string,
) {
  return await db.transaction(async (tx: OrderTransaction) => {
    const resolvedCustomer = await resolveCustomer(tx, input);
    const { subtotal, total } = calculateOrderTotals(input.items);
    const orderNumber = generateOrderNumber();
    const { initialStatus, reviewReasons } = screenItems(input.items);

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

    const createdItems = await tx
      .insert(orderItem)
      .values(buildOrderItemRows(newOrder.id, input.items))
      .returning();

    await tx.insert(orderStatusHistory).values({
      orderId: newOrder.id,
      oldStatus: null,
      newStatus: initialStatus,
      changedBy: createdByUserId || null,
    });

    if (initialStatus === 'requires_review') {
      await tx.insert(orderReview).values({
        orderId: newOrder.id,
        reason: reviewReasons.join('; ').slice(0, 255),
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
