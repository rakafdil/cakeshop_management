// packages/database/src/schema/enums.ts
import { pgEnum } from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', ['admin', 'staff']);
export const productionTypeEnum = pgEnum('production_type', ['batch', 'unit']);
export const fulfillmentTypeEnum = pgEnum('fulfillment_type', ['pre_order', 'ready_stock', 'hybrid']);
export const marketSegmentEnum = pgEnum('market_segment', ['premium_artisan', 'everyday_budget']);
export const productionStatusEnum = pgEnum('production_status', ['planned', 'in_progress', 'completed', 'cancelled']);
export const stockTransactionTypeEnum = pgEnum('stock_transaction_type', ['in', 'out', 'adjustment', 'waste']);
export const orderStatusEnum = pgEnum('order_status', [
  'received', 'confirmed', 'requires_review', 'in_production',
  'ready', 'out_for_delivery', 'completed',
  'cancelled_no_response', 'cancelled_other',
]);
export const orderReviewStatusEnum = pgEnum('order_review_status', ['pending', 'approved', 'rejected']);
export const reminderStatusEnum = pgEnum('reminder_status', ['scheduled', 'sent', 'failed', 'cancelled']);
export const paymentStatusEnum = pgEnum('payment_status', ['pending', 'verified', 'rejected']);
export const financialTransactionTypeEnum = pgEnum('financial_transaction_type', ['income', 'expense']);
export const contentStatusEnum = pgEnum('content_status', ['planned', 'posted', 'skipped']);
export const notificationStatusEnum = pgEnum('notification_status', ['pending', 'sent', 'failed', 'retrying']);
export const negotiationStatusEnum = pgEnum('negotiation_status', [
  'accepted', 'negotiated_down', 'negotiated_no_change', 'cancelled_due_to_price',
]);
export const decorationTypeEnum = pgEnum('decoration_type', ['fondant', 'print', 'buttercream', 'painted', 'none']);
export const sizePortionEnum = pgEnum('size_portion', ['small', 'medium', 'large']);
