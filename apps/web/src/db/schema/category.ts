import { pgTable, serial, varchar } from "drizzle-orm/pg-core";

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),

  name: varchar("name", { length: 255 }).notNull(),

  slug: varchar("slug", { length: 255 }).notNull().unique(),
});
