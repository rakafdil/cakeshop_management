CREATE EXTENSION IF NOT EXISTS "pgcrypto";--> statement-breakpoint
CREATE TYPE "public"."content_status" AS ENUM('planned', 'posted', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."financial_transaction_type" AS ENUM('income', 'expense');--> statement-breakpoint
CREATE TYPE "public"."fulfillment_type" AS ENUM('pre_order', 'ready_stock', 'hybrid');--> statement-breakpoint
CREATE TYPE "public"."market_segment" AS ENUM('premium_artisan', 'everyday_budget');--> statement-breakpoint
CREATE TYPE "public"."notification_status" AS ENUM('pending', 'sent', 'failed', 'retrying');--> statement-breakpoint
CREATE TYPE "public"."order_review_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('received', 'confirmed', 'requires_review', 'in_production', 'ready', 'out_for_delivery', 'completed', 'cancelled_no_response', 'cancelled_other');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'verified', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."production_status" AS ENUM('planned', 'in_progress', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."production_type" AS ENUM('batch', 'unit');--> statement-breakpoint
CREATE TYPE "public"."reminder_status" AS ENUM('scheduled', 'sent', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."stock_transaction_type" AS ENUM('in', 'out', 'adjustment', 'waste');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'staff');--> statement-breakpoint
CREATE TABLE "financial_transaction" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid,
	"type" "financial_transaction_type" NOT NULL,
	"category" varchar(50) NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"transaction_date" date NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ck_financial_transaction_amount" CHECK ("financial_transaction"."amount" >= 0)
);
--> statement-breakpoint
CREATE TABLE "payment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"payment_method" varchar(50) NOT NULL,
	"proof_url" text,
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ck_payment_amount" CHECK ("payment"."amount" >= 0)
);
--> statement-breakpoint
CREATE TABLE "pricing_rule" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid,
	"target_margin_percentage" numeric(5, 4) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ck_pricing_rule_margin" CHECK ("pricing_rule"."target_margin_percentage" >= 0 AND "pricing_rule"."target_margin_percentage" < 1)
);
--> statement-breakpoint
CREATE TABLE "product_cost" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"material_cost" numeric(14, 2) NOT NULL,
	"labor_cost" numeric(14, 2) NOT NULL,
	"tool_depreciation" numeric(14, 2) NOT NULL,
	"complexity_multiplier" numeric(6, 3) DEFAULT '1.0' NOT NULL,
	"risk_buffer_percentage" numeric(5, 4) DEFAULT '0' NOT NULL,
	"hpp" numeric(14, 2) NOT NULL,
	"calculated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ck_product_cost_material" CHECK ("product_cost"."material_cost" >= 0),
	CONSTRAINT "ck_product_cost_labor" CHECK ("product_cost"."labor_cost" >= 0),
	CONSTRAINT "ck_product_cost_tool" CHECK ("product_cost"."tool_depreciation" >= 0),
	CONSTRAINT "ck_product_cost_complexity" CHECK ("product_cost"."complexity_multiplier" >= 1.0),
	CONSTRAINT "ck_product_cost_risk_buffer" CHECK ("product_cost"."risk_buffer_percentage" >= 0 AND "product_cost"."risk_buffer_percentage" < 1),
	CONSTRAINT "ck_product_cost_hpp" CHECK ("product_cost"."hpp" >= 0)
);
--> statement-breakpoint
CREATE TABLE "product_price" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"hpp" numeric(14, 2) NOT NULL,
	"target_margin" numeric(5, 4) NOT NULL,
	"recommended_price" numeric(14, 2) NOT NULL,
	"calculated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ck_product_price_hpp" CHECK ("product_price"."hpp" >= 0),
	CONSTRAINT "ck_product_price_margin" CHECK ("product_price"."target_margin" >= 0 AND "product_price"."target_margin" < 1),
	CONSTRAINT "ck_product_price_recommended" CHECK ("product_price"."recommended_price" >= 0)
);
--> statement-breakpoint
CREATE TABLE "sales_forecast" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"forecast_date" date NOT NULL,
	"recommended_quantity" numeric(14, 3) NOT NULL,
	"confidence_score" numeric(5, 4) NOT NULL,
	"method" varchar(50) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sales_forecast_product_id_forecast_date_unique" UNIQUE("product_id","forecast_date"),
	CONSTRAINT "ck_sales_forecast_quantity" CHECK ("sales_forecast"."recommended_quantity" >= 0),
	CONSTRAINT "ck_sales_forecast_confidence" CHECK ("sales_forecast"."confidence_score" >= 0 AND "sales_forecast"."confidence_score" <= 1)
);
--> statement-breakpoint
CREATE TABLE "content" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"platform" varchar(50) NOT NULL,
	"status" "content_status" DEFAULT 'planned' NOT NULL,
	"scheduled_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portfolio" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"description" text,
	"image_url" text NOT NULL,
	"work_date" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_value_proposition" (
	"product_id" uuid NOT NULL,
	"template_id" uuid NOT NULL,
	CONSTRAINT "product_value_proposition_product_id_template_id_pk" PRIMARY KEY("product_id","template_id")
);
--> statement-breakpoint
CREATE TABLE "value_proposition_template" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_order" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"order_number" varchar(30) NOT NULL,
	"source_channel" varchar(50) NOT NULL,
	"status" "order_status" DEFAULT 'received' NOT NULL,
	"fulfillment_date" date,
	"fulfillment_time" time,
	"delivery_address" text,
	"subtotal" numeric(14, 2) DEFAULT '0' NOT NULL,
	"total" numeric(14, 2) DEFAULT '0' NOT NULL,
	"tracking_token" varchar(64) DEFAULT encode(gen_random_bytes(24), 'hex') NOT NULL,
	"pricelist_snapshot_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customer_order_order_number_unique" UNIQUE("order_number"),
	CONSTRAINT "customer_order_tracking_token_unique" UNIQUE("tracking_token"),
	CONSTRAINT "ck_customer_order_subtotal" CHECK ("customer_order"."subtotal" >= 0),
	CONSTRAINT "ck_customer_order_total" CHECK ("customer_order"."total" >= 0)
);
--> statement-breakpoint
CREATE TABLE "notification_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"trigger_event" varchar(100) NOT NULL,
	"channel" varchar(30) NOT NULL,
	"status" "notification_status" DEFAULT 'pending' NOT NULL,
	"sent_at" timestamp with time zone,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ck_notification_retry_count" CHECK ("notification_log"."retry_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "order_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity" numeric(14, 3) NOT NULL,
	"unit_price" numeric(14, 2) NOT NULL,
	"subtotal" numeric(14, 2) NOT NULL,
	"stated_budget" numeric(14, 2),
	"customization" text,
	CONSTRAINT "ck_order_item_quantity" CHECK ("order_item"."quantity" > 0),
	CONSTRAINT "ck_order_item_unit_price" CHECK ("order_item"."unit_price" >= 0),
	CONSTRAINT "ck_order_item_subtotal" CHECK ("order_item"."subtotal" >= 0)
);
--> statement-breakpoint
CREATE TABLE "order_reminder" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"reminder_number" integer NOT NULL,
	"channel" varchar(30) NOT NULL,
	"scheduled_at" timestamp with time zone NOT NULL,
	"sent_at" timestamp with time zone,
	"status" "reminder_status" DEFAULT 'scheduled' NOT NULL,
	CONSTRAINT "ck_order_reminder_number" CHECK ("order_reminder"."reminder_number" > 0)
);
--> statement-breakpoint
CREATE TABLE "order_review" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"reason" varchar(255) NOT NULL,
	"status" "order_review_status" DEFAULT 'pending' NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "order_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"old_status" "order_status",
	"new_status" "order_status" NOT NULL,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"changed_by" uuid
);
--> statement-breakpoint
CREATE TABLE "price_list_snapshot" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version" varchar(20) NOT NULL,
	"snapshot_data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"production_type" "production_type" NOT NULL,
	"fulfillment_type" "fulfillment_type" DEFAULT 'hybrid' NOT NULL,
	"market_segment" "market_segment" NOT NULL,
	"base_price" numeric(14, 2) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ck_product_base_price" CHECK ("product"."base_price" >= 0)
);
--> statement-breakpoint
CREATE TABLE "product_category" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(150) NOT NULL,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "product_category_map" (
	"product_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	CONSTRAINT "product_category_map_product_id_category_id_pk" PRIMARY KEY("product_id","category_id")
);
--> statement-breakpoint
CREATE TABLE "order_production_slot" (
	"order_id" uuid NOT NULL,
	"production_slot_id" uuid NOT NULL,
	CONSTRAINT "order_production_slot_order_id_production_slot_id_pk" PRIMARY KEY("order_id","production_slot_id")
);
--> statement-breakpoint
CREATE TABLE "production" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"recipe_id" uuid NOT NULL,
	"quantity" numeric(14, 3) NOT NULL,
	"status" "production_status" DEFAULT 'planned' NOT NULL,
	"production_date" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ck_production_quantity" CHECK ("production"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "production_slot" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slot_date" date NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"capacity" integer NOT NULL,
	"reserved_capacity" integer DEFAULT 0 NOT NULL,
	"is_available" boolean DEFAULT true NOT NULL,
	CONSTRAINT "ck_production_slot_capacity" CHECK ("production_slot"."capacity" > 0),
	CONSTRAINT "ck_production_slot_reserved" CHECK ("production_slot"."reserved_capacity" >= 0),
	CONSTRAINT "ck_production_slot_reserved_le_capacity" CHECK ("production_slot"."reserved_capacity" <= "production_slot"."capacity"),
	CONSTRAINT "ck_production_slot_end_after_start" CHECK ("production_slot"."end_time" > "production_slot"."start_time")
);
--> statement-breakpoint
CREATE TABLE "stock_alert" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ingredient_id" uuid NOT NULL,
	"stock_level" numeric(14, 3) NOT NULL,
	"threshold" numeric(14, 3) NOT NULL,
	"is_resolved" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_transaction" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ingredient_id" uuid NOT NULL,
	"transaction_type" "stock_transaction_type" NOT NULL,
	"quantity" numeric(14, 3) NOT NULL,
	"stock_before" numeric(14, 3) NOT NULL,
	"stock_after" numeric(14, 3) NOT NULL,
	"production_id" uuid,
	"order_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ingredient" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(150) NOT NULL,
	"purchase_uom_id" uuid NOT NULL,
	"current_stock" numeric(14, 3) DEFAULT '0' NOT NULL,
	"minimum_stock" numeric(14, 3) DEFAULT '0' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ck_ingredient_current_stock" CHECK ("ingredient"."current_stock" >= 0),
	CONSTRAINT "ck_ingredient_minimum_stock" CHECK ("ingredient"."minimum_stock" >= 0)
);
--> statement-breakpoint
CREATE TABLE "ingredient_price_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ingredient_id" uuid NOT NULL,
	"price" numeric(14, 2) NOT NULL,
	"previous_price" numeric(14, 2),
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ck_iph_price" CHECK ("ingredient_price_history"."price" >= 0)
);
--> statement-breakpoint
CREATE TABLE "labor_rate" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rate_per_hour" numeric(14, 2) NOT NULL,
	"effective_date" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ck_labor_rate_per_hour" CHECK ("labor_rate"."rate_per_hour" >= 0)
);
--> statement-breakpoint
CREATE TABLE "recipe" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"version" varchar(20) DEFAULT '1.0' NOT NULL,
	"preparation_steps" text NOT NULL,
	"difficulty_level" integer NOT NULL,
	"estimated_labor_minutes" numeric(10, 2) NOT NULL,
	"is_complete" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ck_recipe_difficulty_level" CHECK ("recipe"."difficulty_level" BETWEEN 1 AND 5),
	CONSTRAINT "ck_recipe_labor_minutes" CHECK ("recipe"."estimated_labor_minutes" >= 0)
);
--> statement-breakpoint
CREATE TABLE "recipe_image" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipe_id" uuid NOT NULL,
	"image_url" text NOT NULL,
	"caption" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "recipe_ingredient" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipe_id" uuid NOT NULL,
	"ingredient_id" uuid NOT NULL,
	"quantity" numeric(14, 3) NOT NULL,
	"uom_id" uuid NOT NULL,
	"notes" text,
	CONSTRAINT "ck_recipe_ingredient_quantity" CHECK ("recipe_ingredient"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "recipe_tool" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipe_id" uuid NOT NULL,
	"tool_id" uuid NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "ck_recipe_tool_quantity" CHECK ("recipe_tool"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "tool" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(150) NOT NULL,
	"purchase_cost" numeric(14, 2) NOT NULL,
	"useful_life" numeric(14, 2) NOT NULL,
	"cost_per_use" numeric(14, 4) GENERATED ALWAYS AS ((purchase_cost / useful_life)) STORED,
	CONSTRAINT "ck_tool_purchase_cost" CHECK ("tool"."purchase_cost" >= 0),
	CONSTRAINT "ck_tool_useful_life" CHECK ("tool"."useful_life" > 0)
);
--> statement-breakpoint
CREATE TABLE "uom" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(50) NOT NULL,
	"symbol" varchar(10) NOT NULL,
	"type" varchar(20) NOT NULL,
	CONSTRAINT "uom_symbol_unique" UNIQUE("symbol")
);
--> statement-breakpoint
CREATE TABLE "uom_conversion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_uom_id" uuid NOT NULL,
	"to_uom_id" uuid NOT NULL,
	"conversion_factor" numeric(18, 8) NOT NULL,
	CONSTRAINT "uom_conversion_from_uom_id_to_uom_id_unique" UNIQUE("from_uom_id","to_uom_id"),
	CONSTRAINT "ck_uom_conversion_factor" CHECK ("uom_conversion"."conversion_factor" > 0)
);
--> statement-breakpoint
CREATE TABLE "customer" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(150) NOT NULL,
	"email" varchar(255),
	"phone" varchar(30),
	"address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(150) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"role" "user_role" DEFAULT 'staff' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "financial_transaction" ADD CONSTRAINT "financial_transaction_order_id_customer_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."customer_order"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_order_id_customer_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."customer_order"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_rule" ADD CONSTRAINT "pricing_rule_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_cost" ADD CONSTRAINT "product_cost_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_price" ADD CONSTRAINT "product_price_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_forecast" ADD CONSTRAINT "sales_forecast_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio" ADD CONSTRAINT "portfolio_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_value_proposition" ADD CONSTRAINT "product_value_proposition_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_value_proposition" ADD CONSTRAINT "product_value_proposition_template_id_value_proposition_template_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."value_proposition_template"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_order" ADD CONSTRAINT "customer_order_customer_id_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_order" ADD CONSTRAINT "customer_order_pricelist_snapshot_id_price_list_snapshot_id_fk" FOREIGN KEY ("pricelist_snapshot_id") REFERENCES "public"."price_list_snapshot"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_log" ADD CONSTRAINT "notification_log_order_id_customer_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."customer_order"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_order_id_customer_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."customer_order"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_reminder" ADD CONSTRAINT "order_reminder_order_id_customer_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."customer_order"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_review" ADD CONSTRAINT "order_review_order_id_customer_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."customer_order"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_review" ADD CONSTRAINT "order_review_reviewed_by_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_order_id_customer_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."customer_order"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_changed_by_user_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_category_map" ADD CONSTRAINT "product_category_map_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_category_map" ADD CONSTRAINT "product_category_map_category_id_product_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."product_category"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_production_slot" ADD CONSTRAINT "order_production_slot_order_id_customer_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."customer_order"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_production_slot" ADD CONSTRAINT "order_production_slot_production_slot_id_production_slot_id_fk" FOREIGN KEY ("production_slot_id") REFERENCES "public"."production_slot"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production" ADD CONSTRAINT "production_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production" ADD CONSTRAINT "production_recipe_id_recipe_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipe"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_alert" ADD CONSTRAINT "stock_alert_ingredient_id_ingredient_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredient"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_transaction" ADD CONSTRAINT "stock_transaction_ingredient_id_ingredient_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredient"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_transaction" ADD CONSTRAINT "stock_transaction_production_id_production_id_fk" FOREIGN KEY ("production_id") REFERENCES "public"."production"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_transaction" ADD CONSTRAINT "stock_transaction_order_id_customer_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."customer_order"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingredient" ADD CONSTRAINT "ingredient_purchase_uom_id_uom_id_fk" FOREIGN KEY ("purchase_uom_id") REFERENCES "public"."uom"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingredient_price_history" ADD CONSTRAINT "ingredient_price_history_ingredient_id_ingredient_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredient"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe" ADD CONSTRAINT "recipe_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_image" ADD CONSTRAINT "recipe_image_recipe_id_recipe_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipe"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_ingredient" ADD CONSTRAINT "recipe_ingredient_recipe_id_recipe_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipe"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_ingredient" ADD CONSTRAINT "recipe_ingredient_ingredient_id_ingredient_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredient"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_ingredient" ADD CONSTRAINT "recipe_ingredient_uom_id_uom_id_fk" FOREIGN KEY ("uom_id") REFERENCES "public"."uom"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_tool" ADD CONSTRAINT "recipe_tool_recipe_id_recipe_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipe"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_tool" ADD CONSTRAINT "recipe_tool_tool_id_tool_id_fk" FOREIGN KEY ("tool_id") REFERENCES "public"."tool"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uom_conversion" ADD CONSTRAINT "uom_conversion_from_uom_id_uom_id_fk" FOREIGN KEY ("from_uom_id") REFERENCES "public"."uom"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uom_conversion" ADD CONSTRAINT "uom_conversion_to_uom_id_uom_id_fk" FOREIGN KEY ("to_uom_id") REFERENCES "public"."uom"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_financial_transaction_date_type" ON "financial_transaction" USING btree ("transaction_date","type");--> statement-breakpoint
CREATE INDEX "idx_financial_transaction_category" ON "financial_transaction" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_financial_transaction_order" ON "financial_transaction" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_payment_order" ON "payment" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_payment_status" ON "payment" USING btree ("status") WHERE "payment"."status" = 'pending';--> statement-breakpoint
CREATE UNIQUE INDEX "idx_pricing_rule_product" ON "pricing_rule" USING btree ("product_id") WHERE "pricing_rule"."product_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_pricing_rule_single_default" ON "pricing_rule" USING btree ((true)) WHERE "pricing_rule"."product_id" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_product_cost_product_calculated" ON "product_cost" USING btree ("product_id","calculated_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_product_price_product_calculated" ON "product_price" USING btree ("product_id","calculated_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_sales_forecast_date" ON "sales_forecast" USING btree ("forecast_date");--> statement-breakpoint
CREATE INDEX "idx_content_scheduled_date" ON "content" USING btree ("scheduled_date") WHERE "content"."status" = 'planned';--> statement-breakpoint
CREATE INDEX "idx_portfolio_product_date" ON "portfolio" USING btree ("product_id","work_date" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_pvp_template" ON "product_value_proposition" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "idx_customer_order_customer" ON "customer_order" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "idx_customer_order_status" ON "customer_order" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_customer_order_fulfillment_date" ON "customer_order" USING btree ("fulfillment_date");--> statement-breakpoint
CREATE INDEX "idx_notification_log_order" ON "notification_log" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_notification_log_pending" ON "notification_log" USING btree ("status") WHERE "notification_log"."status" IN ('pending', 'retrying');--> statement-breakpoint
CREATE INDEX "idx_order_item_order" ON "order_item" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_order_item_product" ON "order_item" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_order_reminder_order" ON "order_reminder" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_order_reminder_due" ON "order_reminder" USING btree ("scheduled_at") WHERE "order_reminder"."status" = 'scheduled';--> statement-breakpoint
CREATE INDEX "idx_order_review_order" ON "order_review" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_order_review_pending" ON "order_review" USING btree ("status") WHERE "order_review"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "idx_order_status_history_order" ON "order_status_history" USING btree ("order_id","changed_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_price_list_snapshot_created" ON "price_list_snapshot" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_product_active" ON "product" USING btree ("is_active") WHERE "product"."is_active" = true;--> statement-breakpoint
CREATE INDEX "idx_product_market_segment" ON "product" USING btree ("market_segment");--> statement-breakpoint
CREATE INDEX "idx_pcm_category" ON "product_category_map" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "idx_ops_slot" ON "order_production_slot" USING btree ("production_slot_id");--> statement-breakpoint
CREATE INDEX "idx_production_product_date" ON "production" USING btree ("product_id","production_date");--> statement-breakpoint
CREATE INDEX "idx_production_status" ON "production" USING btree ("status") WHERE "production"."status" IN ('planned', 'in_progress');--> statement-breakpoint
CREATE INDEX "idx_production_slot_date" ON "production_slot" USING btree ("slot_date") WHERE "production_slot"."is_available" = true;--> statement-breakpoint
CREATE INDEX "idx_stock_alert_unresolved" ON "stock_alert" USING btree ("ingredient_id") WHERE "stock_alert"."is_resolved" = false;--> statement-breakpoint
CREATE INDEX "idx_stock_transaction_ingredient_date" ON "stock_transaction" USING btree ("ingredient_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_stock_transaction_production" ON "stock_transaction" USING btree ("production_id");--> statement-breakpoint
CREATE INDEX "idx_stock_transaction_order" ON "stock_transaction" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_ingredient_low_stock" ON "ingredient" USING btree ("current_stock") WHERE "ingredient"."is_active" = true;--> statement-breakpoint
CREATE INDEX "idx_iph_ingredient_date" ON "ingredient_price_history" USING btree ("ingredient_id","changed_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_labor_rate_effective_date" ON "labor_rate" USING btree ("effective_date" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_recipe_product" ON "recipe" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_recipe_product_version" ON "recipe" USING btree ("product_id","version");--> statement-breakpoint
CREATE INDEX "idx_recipe_image_recipe" ON "recipe_image" USING btree ("recipe_id");--> statement-breakpoint
CREATE INDEX "idx_recipe_ingredient_recipe" ON "recipe_ingredient" USING btree ("recipe_id");--> statement-breakpoint
CREATE INDEX "idx_recipe_ingredient_ingredient" ON "recipe_ingredient" USING btree ("ingredient_id");--> statement-breakpoint
CREATE INDEX "idx_recipe_tool_recipe" ON "recipe_tool" USING btree ("recipe_id");--> statement-breakpoint
CREATE INDEX "idx_recipe_tool_tool" ON "recipe_tool" USING btree ("tool_id");--> statement-breakpoint
CREATE INDEX "idx_uom_conversion_to" ON "uom_conversion" USING btree ("to_uom_id");--> statement-breakpoint
CREATE INDEX "idx_customer_phone" ON "customer" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "idx_customer_email" ON "customer" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_user_role" ON "user" USING btree ("role") WHERE "user"."is_active" = true;