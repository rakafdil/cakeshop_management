import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { categories } from "./category";

export const products = pgTable("products", {
  id: serial("id").primaryKey(),

  categoryId: integer("category_id")
    .notNull()
    .references(() => categories.id, {
      onDelete: "restrict",
      onUpdate: "cascade",
    }),

  name: varchar("name", { length: 255 }).notNull(),

  description: text("description"),

  catalogType: varchar("catalog_type", { length: 100 }).notNull(),

  status: varchar("status", { length: 50 }).notNull().default("active"),

  createdAt: timestamp("created_at", {
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),

  updatedAt: timestamp("updated_at", {
    withTimezone: true,
  })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});
