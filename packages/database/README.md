# @bakery/database

PostgreSQL schema + migrations for the Cakeshop Management Platform. This package is the **single source of truth** for the database structure.

## What's inside

- `src/schema/` — Drizzle schema definitions, organized by domain:
  - `enums.ts` — PostgreSQL enum types
  - `user.ts` — `user`, `customer`
  - `product.ts` — `product`, `product_category`, `product_category_map`
  - `recipe.ts` — `uom`, `uom_conversion`, `tool`, `labor_rate`, `ingredient`, `ingredient_price_history`, `recipe`, `recipe_ingredient`, `recipe_tool`, `recipe_image`
  - `production.ts` — `production_slot`, `production`, `stock_transaction`, `stock_alert`, `order_production_slot`
  - `order.ts` — `price_list_snapshot`, `customer_order`, `order_item`, `order_status_history`, `order_review`, `order_reminder`, `notification_log`
  - `finance.ts` — `payment`, `financial_transaction`, `product_cost`, `pricing_rule`, `product_price`, `sales_forecast`
  - `marketing.ts` — `content`, `value_proposition_template`, `product_value_proposition`, `portfolio`
- `migrations/` — Drizzle migrations (generated + one hand-written `0001_auto_updated_at.sql` for the `set_updated_at()` triggers)

## Usage

```bash
bun run db:generate   # generate a new migration from schema changes
bun run db:migrate    # apply pending migrations to DATABASE_URL
bun run db:check      # verify schema <-> migration consistency
bun run db:studio     # open Drizzle Studio
```

Requires `DATABASE_URL` (e.g. in a `.env` file in this package):

```
DATABASE_URL=postgres://user:password@localhost:5432/cakeshop
```

The `0001_auto_updated_at` migration is written by hand because Drizzle does not generate triggers. It recreates the `set_updated_at()` function and attaches `BEFORE UPDATE` triggers to every table that carries an `updated_at` column, matching `Cakeshop Management.sql`.

See `docs/database.md` for the full schema overview.
