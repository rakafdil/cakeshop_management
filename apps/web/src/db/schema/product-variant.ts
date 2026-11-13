import {
  pgTable,
  serial,
  integer,
  varchar,
  numeric,
} from "drizzle-orm/pg-core";

import { products } from "./product";

export const productVariants = pgTable("product_variants", {
  id: serial("id").primaryKey(),

  productId: integer("product_id")
    .notNull()
    .references(() => products.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),

  variantType: varchar("variant_type", { length: 100 })
    .notNull(),

  name: varchar("name", { length: 255 })
    .notNull(),

  additionalPrice: numeric("additional_price", {
    precision: 12,
    scale: 2,
  })
    .notNull()
    .default("0"),
});