import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { customerOrder } from '@bakery/database/schema';

// Order DTOs derived directly from the Drizzle schema (single source of truth).
// Server-managed fields (id, orderNumber, trackingToken, timestamps) are omitted from Create*.

export const CreateOrderSchema = createInsertSchema(customerOrder).omit({
  id: true,
  orderNumber: true,
  trackingToken: true,
  status: true,
  createdAt: true,
  updatedAt: true,
});

export const OrderSchema = createSelectSchema(customerOrder);

export type CreateOrderDto = typeof CreateOrderSchema.type;
export type OrderDto = typeof OrderSchema.type;
