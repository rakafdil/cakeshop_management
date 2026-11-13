import { pgTable, serial, integer, varchar } from "drizzle-orm/pg-core";

import { products } from "./product";

export const productMedia = pgTable("product_media", {
  id: serial("id").primaryKey(),

  productId: integer("product_id")
    .notNull()
    .references(() => products.id, {
      onDelete: "cascade",
    }),

  storageKey: varchar("storage_key", {
    length: 2048,
  }).notNull(),

  mediaType: varchar("media_type", {
    length: 50,
  }).notNull(),

  mimeType: varchar("mime_type", {
    length: 100,
  }).notNull(),

  thumbnailKey: varchar("thumbnail_key", {
    length: 2048,
  }),

  duration: integer("duration"),

  sortOrder: integer("sort_order").notNull().default(0),
});
