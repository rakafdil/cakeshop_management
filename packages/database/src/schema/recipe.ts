// packages/database/src/schema/recipe.ts
import { sql } from 'drizzle-orm';
import {
  pgTable, uuid, varchar, text, decimal, integer, boolean, date, timestamp,
  index, unique, uniqueIndex, check,
} from 'drizzle-orm/pg-core';
import { product } from './product';

export const uom = pgTable('uom', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 50 }).notNull(),
  symbol: varchar('symbol', { length: 10 }).notNull().unique(),
  type: varchar('type', { length: 20 }).notNull(),
});

export const uomConversion = pgTable('uom_conversion', {
  id: uuid('id').primaryKey().defaultRandom(),
  fromUomId: uuid('from_uom_id').notNull().references(() => uom.id, { onDelete: 'restrict' }),
  toUomId: uuid('to_uom_id').notNull().references(() => uom.id, { onDelete: 'restrict' }),
  conversionFactor: decimal('conversion_factor', { precision: 18, scale: 8 }).notNull(),
}, (t) => [
  unique().on(t.fromUomId, t.toUomId),
  index('idx_uom_conversion_to').on(t.toUomId),
  check('ck_uom_conversion_factor', sql`${t.conversionFactor} > 0`),
]);

export const tool = pgTable('tool', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 150 }).notNull(),
  purchaseCost: decimal('purchase_cost', { precision: 14, scale: 2 }).notNull(),
  usefulLife: decimal('useful_life', { precision: 14, scale: 2 }).notNull(),
  costPerUse: decimal('cost_per_use', { precision: 14, scale: 4 })
    .generatedAlwaysAs(sql`(purchase_cost / useful_life)`),
}, (t) => [
  check('ck_tool_purchase_cost', sql`${t.purchaseCost} >= 0`),
  check('ck_tool_useful_life', sql`${t.usefulLife} > 0`),
]);

export const laborRate = pgTable('labor_rate', {
  id: uuid('id').primaryKey().defaultRandom(),
  ratePerHour: decimal('rate_per_hour', { precision: 14, scale: 2 }).notNull(),
  effectiveDate: date('effective_date').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('idx_labor_rate_effective_date').on(t.effectiveDate.desc()),
  check('ck_labor_rate_per_hour', sql`${t.ratePerHour} >= 0`),
]);

export const ingredient = pgTable('ingredient', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 150 }).notNull(),
  purchaseUomId: uuid('purchase_uom_id').notNull().references(() => uom.id, { onDelete: 'restrict' }),
  currentStock: decimal('current_stock', { precision: 14, scale: 3 }).notNull().default('0'),
  minimumStock: decimal('minimum_stock', { precision: 14, scale: 3 }).notNull().default('0'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('idx_ingredient_low_stock').on(t.currentStock).where(sql`${t.isActive} = true`),
  check('ck_ingredient_current_stock', sql`${t.currentStock} >= 0`),
  check('ck_ingredient_minimum_stock', sql`${t.minimumStock} >= 0`),
]);

export const ingredientPriceHistory = pgTable('ingredient_price_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  ingredientId: uuid('ingredient_id').notNull().references(() => ingredient.id, { onDelete: 'cascade' }),
  price: decimal('price', { precision: 14, scale: 2 }).notNull(),
  previousPrice: decimal('previous_price', { precision: 14, scale: 2 }),
  changedAt: timestamp('changed_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('idx_iph_ingredient_date').on(t.ingredientId, t.changedAt.desc()),
  check('ck_iph_price', sql`${t.price} >= 0`),
]);

export const recipe = pgTable('recipe', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id').notNull().references(() => product.id, { onDelete: 'cascade' }),
  version: varchar('version', { length: 20 }).notNull().default('1.0'),
  preparationSteps: text('preparation_steps').notNull(),
  difficultyLevel: integer('difficulty_level').notNull(),
  estimatedLaborMinutes: decimal('estimated_labor_minutes', { precision: 10, scale: 2 }).notNull(),
  isComplete: boolean('is_complete').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('idx_recipe_product').on(t.productId),
  uniqueIndex('idx_recipe_product_version').on(t.productId, t.version),
  check('ck_recipe_difficulty_level', sql`${t.difficultyLevel} BETWEEN 1 AND 5`),
  check('ck_recipe_labor_minutes', sql`${t.estimatedLaborMinutes} >= 0`),
]);

export const recipeIngredient = pgTable('recipe_ingredient', {
  id: uuid('id').primaryKey().defaultRandom(),
  recipeId: uuid('recipe_id').notNull().references(() => recipe.id, { onDelete: 'cascade' }),
  ingredientId: uuid('ingredient_id').notNull().references(() => ingredient.id, { onDelete: 'restrict' }),
  quantity: decimal('quantity', { precision: 14, scale: 3 }).notNull(),
  uomId: uuid('uom_id').notNull().references(() => uom.id, { onDelete: 'restrict' }),
  notes: text('notes'),
}, (t) => [
  index('idx_recipe_ingredient_recipe').on(t.recipeId),
  index('idx_recipe_ingredient_ingredient').on(t.ingredientId),
  check('ck_recipe_ingredient_quantity', sql`${t.quantity} > 0`),
]);

export const recipeTool = pgTable('recipe_tool', {
  id: uuid('id').primaryKey().defaultRandom(),
  recipeId: uuid('recipe_id').notNull().references(() => recipe.id, { onDelete: 'cascade' }),
  toolId: uuid('tool_id').notNull().references(() => tool.id, { onDelete: 'restrict' }),
  quantity: integer('quantity').notNull().default(1),
}, (t) => [
  index('idx_recipe_tool_recipe').on(t.recipeId),
  index('idx_recipe_tool_tool').on(t.toolId),
  check('ck_recipe_tool_quantity', sql`${t.quantity} > 0`),
]);

export const recipeImage = pgTable('recipe_image', {
  id: uuid('id').primaryKey().defaultRandom(),
  recipeId: uuid('recipe_id').notNull().references(() => recipe.id, { onDelete: 'cascade' }),
  imageUrl: text('image_url').notNull(),
  caption: varchar('caption', { length: 255 }),
}, (t) => [
  index('idx_recipe_image_recipe').on(t.recipeId),
]);
