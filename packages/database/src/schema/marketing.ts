// packages/database/src/schema/marketing.ts
import { sql } from 'drizzle-orm';
import {
  pgTable, uuid, varchar, text, boolean, date, timestamp,
  index, primaryKey,
} from 'drizzle-orm/pg-core';
import { product } from './product';
import { contentStatusEnum } from './enums';

export const content = pgTable('content', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content').notNull(),
  platform: varchar('platform', { length: 50 }).notNull(),
  status: contentStatusEnum('status').notNull().default('planned'),
  scheduledDate: date('scheduled_date'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('idx_content_scheduled_date').on(t.scheduledDate).where(sql`${t.status} = 'planned'`),
]);

export const valuePropositionTemplate = pgTable('value_proposition_template', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const productValueProposition = pgTable('product_value_proposition', {
  productId: uuid('product_id').notNull().references(() => product.id, { onDelete: 'cascade' }),
  templateId: uuid('template_id').notNull().references(() => valuePropositionTemplate.id, { onDelete: 'cascade' }),
}, (t) => [
  primaryKey({ columns: [t.productId, t.templateId] }),
  index('idx_pvp_template').on(t.templateId),
]);

export const portfolio = pgTable('portfolio', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id').notNull().references(() => product.id, { onDelete: 'cascade' }),
  description: text('description'),
  imageUrl: text('image_url').notNull(),
  workDate: date('work_date').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('idx_portfolio_product_date').on(t.productId, t.workDate.desc()),
]);
