import {
  pgTable,
  serial,
  integer,
  varchar,
  numeric,
} from "drizzle-orm/pg-core";

import { products } from "./product";

export const productPrices = pgTable("product_prices", {
  id: serial("id").primaryKey(),

  productId: integer("product_id")
    .notNull()
    .references(() => products.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),

  label: varchar("label", { length: 100 })
    .notNull(),

  price: numeric("price", {
    precision: 12,
    scale: 2,
  }).notNull(),
});