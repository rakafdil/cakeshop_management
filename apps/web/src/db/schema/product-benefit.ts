import {
  pgTable,
  serial,
  integer,
  varchar,
} from "drizzle-orm/pg-core";

import { products } from "./product";

export const productBenefits = pgTable("product_benefits", {
  id: serial("id").primaryKey(),

  productId: integer("product_id")
    .notNull()
    .references(() => products.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),

  description: varchar("description", { length: 500 })
    .notNull(),
});