// packages/database/src/schema/production.ts
import { sql } from 'drizzle-orm';
import {
  pgTable, uuid, decimal, integer, boolean, date, time, timestamp,
  index, primaryKey, check,
} from 'drizzle-orm/pg-core';
import { product } from './product';
import { recipe, ingredient } from './recipe';
import { customerOrder } from './order';
import { productionStatusEnum, stockTransactionTypeEnum } from './enums';

export const productionSlot = pgTable('production_slot', {
  id: uuid('id').primaryKey().defaultRandom(),
  slotDate: date('slot_date').notNull(),
  startTime: time('start_time').notNull(),
  endTime: time('end_time').notNull(),
  capacity: integer('capacity').notNull(),
  reservedCapacity: integer('reserved_capacity').notNull().default(0),
  isAvailable: boolean('is_available').notNull().default(true),
}, (t) => [
  index('idx_production_slot_date').on(t.slotDate).where(sql`${t.isAvailable} = true`),
  check('ck_production_slot_capacity', sql`${t.capacity} > 0`),
  check('ck_production_slot_reserved', sql`${t.reservedCapacity} >= 0`),
  check('ck_production_slot_reserved_le_capacity', sql`${t.reservedCapacity} <= ${t.capacity}`),
  check('ck_production_slot_end_after_start', sql`${t.endTime} > ${t.startTime}`),
]);

export const production = pgTable('production', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id').notNull().references(() => product.id, { onDelete: 'restrict' }),
  recipeId: uuid('recipe_id').notNull().references(() => recipe.id, { onDelete: 'restrict' }),
  quantity: decimal('quantity', { precision: 14, scale: 3 }).notNull(),
  status: productionStatusEnum('status').notNull().default('planned'),
  productionDate: date('production_date').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('idx_production_product_date').on(t.productId, t.productionDate),
  index('idx_production_status').on(t.status).where(sql`${t.status} IN ('planned', 'in_progress')`),
  check('ck_production_quantity', sql`${t.quantity} > 0`),
]);

export const stockTransaction = pgTable('stock_transaction', {
  id: uuid('id').primaryKey().defaultRandom(),
  ingredientId: uuid('ingredient_id').notNull().references(() => ingredient.id, { onDelete: 'restrict' }),
  transactionType: stockTransactionTypeEnum('transaction_type').notNull(),
  quantity: decimal('quantity', { precision: 14, scale: 3 }).notNull(),
  stockBefore: decimal('stock_before', { precision: 14, scale: 3 }).notNull(),
  stockAfter: decimal('stock_after', { precision: 14, scale: 3 }).notNull(),
  productionId: uuid('production_id').references(() => production.id, { onDelete: 'set null' }),
  orderId: uuid('order_id').references(() => customerOrder.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('idx_stock_transaction_ingredient_date').on(t.ingredientId, t.createdAt.desc()),
  index('idx_stock_transaction_production').on(t.productionId),
  index('idx_stock_transaction_order').on(t.orderId),
]);

export const stockAlert = pgTable('stock_alert', {
  id: uuid('id').primaryKey().defaultRandom(),
  ingredientId: uuid('ingredient_id').notNull().references(() => ingredient.id, { onDelete: 'cascade' }),
  stockLevel: decimal('stock_level', { precision: 14, scale: 3 }).notNull(),
  threshold: decimal('threshold', { precision: 14, scale: 3 }).notNull(),
  isResolved: boolean('is_resolved').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('idx_stock_alert_unresolved').on(t.ingredientId).where(sql`${t.isResolved} = false`),
]);

export const orderProductionSlot = pgTable('order_production_slot', {
  orderId: uuid('order_id').notNull().references(() => customerOrder.id, { onDelete: 'cascade' }),
  productionSlotId: uuid('production_slot_id').notNull().references(() => productionSlot.id, { onDelete: 'restrict' }),
}, (t) => [
  primaryKey({ columns: [t.orderId, t.productionSlotId] }),
  index('idx_ops_slot').on(t.productionSlotId),
]);
