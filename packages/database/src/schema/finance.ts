// packages/database/src/schema/finance.ts
import { sql } from 'drizzle-orm';
import {
  pgTable, uuid, varchar, text, decimal, date, timestamp,
  index, unique, uniqueIndex, check,
} from 'drizzle-orm/pg-core';
import { product } from './product';
import { customerOrder } from './order';
import { paymentStatusEnum, financialTransactionTypeEnum } from './enums';

export const payment = pgTable('payment', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').notNull().references(() => customerOrder.id, { onDelete: 'cascade' }),
  amount: decimal('amount', { precision: 14, scale: 2 }).notNull(),
  paymentMethod: varchar('payment_method', { length: 50 }).notNull(),
  proofUrl: text('proof_url'),
  status: paymentStatusEnum('status').notNull().default('pending'),
  paidAt: timestamp('paid_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('idx_payment_order').on(t.orderId),
  index('idx_payment_status').on(t.status).where(sql`${t.status} = 'pending'`),
  check('ck_payment_amount', sql`${t.amount} >= 0`),
]);

export const financialTransaction = pgTable('financial_transaction', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').references(() => customerOrder.id, { onDelete: 'set null' }),
  type: financialTransactionTypeEnum('type').notNull(),
  category: varchar('category', { length: 50 }).notNull(),
  amount: decimal('amount', { precision: 14, scale: 2 }).notNull(),
  transactionDate: date('transaction_date').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('idx_financial_transaction_date_type').on(t.transactionDate, t.type),
  index('idx_financial_transaction_category').on(t.category),
  index('idx_financial_transaction_order').on(t.orderId),
  check('ck_financial_transaction_amount', sql`${t.amount} >= 0`),
]);

export const productCost = pgTable('product_cost', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id').notNull().references(() => product.id, { onDelete: 'cascade' }),
  materialCost: decimal('material_cost', { precision: 14, scale: 2 }).notNull(),
  laborCost: decimal('labor_cost', { precision: 14, scale: 2 }).notNull(),
  toolDepreciation: decimal('tool_depreciation', { precision: 14, scale: 2 }).notNull(),
  complexityMultiplier: decimal('complexity_multiplier', { precision: 6, scale: 3 }).notNull().default('1.0'),
  riskBufferPercentage: decimal('risk_buffer_percentage', { precision: 5, scale: 4 }).notNull().default('0'),
  hpp: decimal('hpp', { precision: 14, scale: 2 }).notNull(),
  calculatedAt: timestamp('calculated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('idx_product_cost_product_calculated').on(t.productId, t.calculatedAt.desc()),
  check('ck_product_cost_material', sql`${t.materialCost} >= 0`),
  check('ck_product_cost_labor', sql`${t.laborCost} >= 0`),
  check('ck_product_cost_tool', sql`${t.toolDepreciation} >= 0`),
  check('ck_product_cost_complexity', sql`${t.complexityMultiplier} >= 1.0`),
  check('ck_product_cost_risk_buffer', sql`${t.riskBufferPercentage} >= 0 AND ${t.riskBufferPercentage} < 1`),
  check('ck_product_cost_hpp', sql`${t.hpp} >= 0`),
]);

export const pricingRule = pgTable('pricing_rule', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id').references(() => product.id, { onDelete: 'cascade' }),
  targetMarginPercentage: decimal('target_margin_percentage', { precision: 5, scale: 4 }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('idx_pricing_rule_product').on(t.productId).where(sql`${t.productId} IS NOT NULL`),
  uniqueIndex('idx_pricing_rule_single_default').on(sql`(true)`).where(sql`${t.productId} IS NULL`),
  check('ck_pricing_rule_margin', sql`${t.targetMarginPercentage} >= 0 AND ${t.targetMarginPercentage} < 1`),
]);

export const productPrice = pgTable('product_price', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id').notNull().references(() => product.id, { onDelete: 'cascade' }),
  hpp: decimal('hpp', { precision: 14, scale: 2 }).notNull(),
  targetMargin: decimal('target_margin', { precision: 5, scale: 4 }).notNull(),
  recommendedPrice: decimal('recommended_price', { precision: 14, scale: 2 }).notNull(),
  calculatedAt: timestamp('calculated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('idx_product_price_product_calculated').on(t.productId, t.calculatedAt.desc()),
  check('ck_product_price_hpp', sql`${t.hpp} >= 0`),
  check('ck_product_price_margin', sql`${t.targetMargin} >= 0 AND ${t.targetMargin} < 1`),
  check('ck_product_price_recommended', sql`${t.recommendedPrice} >= 0`),
]);

export const salesForecast = pgTable('sales_forecast', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id').notNull().references(() => product.id, { onDelete: 'cascade' }),
  forecastDate: date('forecast_date').notNull(),
  recommendedQuantity: decimal('recommended_quantity', { precision: 14, scale: 3 }).notNull(),
  confidenceScore: decimal('confidence_score', { precision: 5, scale: 4 }).notNull(),
  method: varchar('method', { length: 50 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique().on(t.productId, t.forecastDate),
  index('idx_sales_forecast_date').on(t.forecastDate),
  check('ck_sales_forecast_quantity', sql`${t.recommendedQuantity} >= 0`),
  check('ck_sales_forecast_confidence', sql`${t.confidenceScore} >= 0 AND ${t.confidenceScore} <= 1`),
]);
