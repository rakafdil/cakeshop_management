// packages/database/src/schema/order.ts
import { sql } from 'drizzle-orm';
import {
  pgTable, uuid, varchar, text, decimal, integer, jsonb, date, time, timestamp,
  index, check,
} from 'drizzle-orm/pg-core';
import { user, customer } from './user';
import { product } from './product';
import { orderStatusEnum, orderReviewStatusEnum, reminderStatusEnum, notificationStatusEnum } from './enums';

export const priceListSnapshot = pgTable('price_list_snapshot', {
  id: uuid('id').primaryKey().defaultRandom(),
  version: varchar('version', { length: 20 }).notNull(),
  snapshotData: jsonb('snapshot_data').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('idx_price_list_snapshot_created').on(t.createdAt.desc()),
]);

export const customerOrder = pgTable('customer_order', {
  id: uuid('id').primaryKey().defaultRandom(),
  customerId: uuid('customer_id').notNull().references(() => customer.id, { onDelete: 'restrict' }),
  orderNumber: varchar('order_number', { length: 30 }).notNull().unique(),
  sourceChannel: varchar('source_channel', { length: 50 }).notNull(),
  status: orderStatusEnum('status').notNull().default('received'),
  fulfillmentDate: date('fulfillment_date'),
  fulfillmentTime: time('fulfillment_time'),
  deliveryAddress: text('delivery_address'),
  subtotal: decimal('subtotal', { precision: 14, scale: 2 }).notNull().default('0'),
  total: decimal('total', { precision: 14, scale: 2 }).notNull().default('0'),
  trackingToken: varchar('tracking_token', { length: 64 })
    .notNull()
    .unique()
    .default(sql`encode(gen_random_bytes(24), 'hex')`),
  pricelistSnapshotId: uuid('pricelist_snapshot_id').references(() => priceListSnapshot.id, { onDelete: 'restrict' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('idx_customer_order_customer').on(t.customerId),
  index('idx_customer_order_status').on(t.status),
  index('idx_customer_order_fulfillment_date').on(t.fulfillmentDate),
  check('ck_customer_order_subtotal', sql`${t.subtotal} >= 0`),
  check('ck_customer_order_total', sql`${t.total} >= 0`),
]);

export const orderItem = pgTable('order_item', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').notNull().references(() => customerOrder.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').notNull().references(() => product.id, { onDelete: 'restrict' }),
  quantity: decimal('quantity', { precision: 14, scale: 3 }).notNull(),
  unitPrice: decimal('unit_price', { precision: 14, scale: 2 }).notNull(),
  subtotal: decimal('subtotal', { precision: 14, scale: 2 }).notNull(),
  statedBudget: decimal('stated_budget', { precision: 14, scale: 2 }),
  customization: text('customization'),
}, (t) => [
  index('idx_order_item_order').on(t.orderId),
  index('idx_order_item_product').on(t.productId),
  check('ck_order_item_quantity', sql`${t.quantity} > 0`),
  check('ck_order_item_unit_price', sql`${t.unitPrice} >= 0`),
  check('ck_order_item_subtotal', sql`${t.subtotal} >= 0`),
]);

export const orderStatusHistory = pgTable('order_status_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').notNull().references(() => customerOrder.id, { onDelete: 'cascade' }),
  oldStatus: orderStatusEnum('old_status'),
  newStatus: orderStatusEnum('new_status').notNull(),
  changedAt: timestamp('changed_at', { withTimezone: true }).notNull().defaultNow(),
  changedBy: uuid('changed_by').references(() => user.id, { onDelete: 'set null' }),
}, (t) => [
  index('idx_order_status_history_order').on(t.orderId, t.changedAt.desc()),
]);

export const orderReview = pgTable('order_review', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').notNull().references(() => customerOrder.id, { onDelete: 'cascade' }),
  reason: varchar('reason', { length: 255 }).notNull(),
  status: orderReviewStatusEnum('status').notNull().default('pending'),
  reviewedBy: uuid('reviewed_by').references(() => user.id, { onDelete: 'set null' }),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  notes: text('notes'),
}, (t) => [
  index('idx_order_review_order').on(t.orderId),
  index('idx_order_review_pending').on(t.status).where(sql`${t.status} = 'pending'`),
]);

export const orderReminder = pgTable('order_reminder', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').notNull().references(() => customerOrder.id, { onDelete: 'cascade' }),
  reminderNumber: integer('reminder_number').notNull(),
  channel: varchar('channel', { length: 30 }).notNull(),
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull(),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  status: reminderStatusEnum('status').notNull().default('scheduled'),
}, (t) => [
  index('idx_order_reminder_order').on(t.orderId),
  index('idx_order_reminder_due').on(t.scheduledAt).where(sql`${t.status} = 'scheduled'`),
  check('ck_order_reminder_number', sql`${t.reminderNumber} > 0`),
]);

export const notificationLog = pgTable('notification_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').notNull().references(() => customerOrder.id, { onDelete: 'cascade' }),
  triggerEvent: varchar('trigger_event', { length: 100 }).notNull(),
  channel: varchar('channel', { length: 30 }).notNull(),
  status: notificationStatusEnum('status').notNull().default('pending'),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  retryCount: integer('retry_count').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('idx_notification_log_order').on(t.orderId),
  index('idx_notification_log_pending').on(t.status).where(sql`${t.status} IN ('pending', 'retrying')`),
  check('ck_notification_retry_count', sql`${t.retryCount} >= 0`),
]);
