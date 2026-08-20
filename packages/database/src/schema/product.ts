// packages/database/src/schema/product.ts
import { sql } from 'drizzle-orm';
import { pgTable, uuid, varchar, text, decimal, boolean, timestamp, index, primaryKey, check } from 'drizzle-orm/pg-core';
import { productionTypeEnum, marketSegmentEnum, fulfillmentTypeEnum } from './enums';

export const product = pgTable('product', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description'),
  productionType: productionTypeEnum('production_type').notNull(),
  fulfillmentType: fulfillmentTypeEnum('fulfillment_type').notNull().default('hybrid'),
  marketSegment: marketSegmentEnum('market_segment').notNull(),
  basePrice: decimal('base_price', { precision: 14, scale: 2 }).notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('idx_product_active').on(t.isActive).where(sql`${t.isActive} = true`),
  index('idx_product_market_segment').on(t.marketSegment),
  check('ck_product_base_price', sql`${t.basePrice} >= 0`),
]);

export const productCategory = pgTable('product_category', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 150 }).notNull(),
  description: text('description'),
});

export const productCategoryMap = pgTable('product_category_map', {
  productId: uuid('product_id').notNull().references(() => product.id, { onDelete: 'cascade' }),
  categoryId: uuid('category_id').notNull().references(() => productCategory.id, { onDelete: 'cascade' }),
}, (t) => [
  primaryKey({ columns: [t.productId, t.categoryId] }),
  index('idx_pcm_category').on(t.categoryId),
]);
