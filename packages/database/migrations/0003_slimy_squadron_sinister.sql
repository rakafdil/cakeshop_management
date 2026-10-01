CREATE TYPE "public"."decoration_type" AS ENUM('fondant', 'print', 'buttercream', 'painted', 'none');--> statement-breakpoint
CREATE TYPE "public"."negotiation_status" AS ENUM('accepted', 'negotiated_down', 'negotiated_no_change', 'cancelled_due_to_price');--> statement-breakpoint
CREATE TYPE "public"."size_portion" AS ENUM('small', 'medium', 'large');--> statement-breakpoint
CREATE TABLE "price_recommendation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_item_id" uuid NOT NULL,
	"complexity_input" numeric(6, 3) NOT NULL,
	"material_cost_input" numeric(14, 2) NOT NULL,
	"scale_input" numeric(14, 3) NOT NULL,
	"turnaround_input" numeric(10, 2) NOT NULL,
	"recommended_price" numeric(14, 2) NOT NULL,
	"method" varchar(50) NOT NULL,
	"calculated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ck_price_recommendation_material_cost" CHECK ("price_recommendation"."material_cost_input" >= 0),
	CONSTRAINT "ck_price_recommendation_recommended_price" CHECK ("price_recommendation"."recommended_price" >= 0)
);
--> statement-breakpoint
ALTER TABLE "customer_order" ADD COLUMN "quoted_total" numeric(14, 2);--> statement-breakpoint
ALTER TABLE "customer_order" ADD COLUMN "negotiation_status" "negotiation_status";--> statement-breakpoint
ALTER TABLE "order_item" ADD COLUMN "uom_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "order_item" ADD COLUMN "decoration_type" "decoration_type" DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "order_item" ADD COLUMN "complexity_score" integer;--> statement-breakpoint
ALTER TABLE "order_item" ADD COLUMN "size_portion" "size_portion";--> statement-breakpoint
ALTER TABLE "order_item" ADD COLUMN "tier_count" integer;--> statement-breakpoint
ALTER TABLE "price_recommendation" ADD CONSTRAINT "price_recommendation_order_item_id_order_item_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_price_recommendation_item_calculated" ON "price_recommendation" USING btree ("order_item_id","calculated_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_price_recommendation_method" ON "price_recommendation" USING btree ("method");--> statement-breakpoint
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_uom_id_uom_id_fk" FOREIGN KEY ("uom_id") REFERENCES "public"."uom"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_customer_order_negotiation_status" ON "customer_order" USING btree ("negotiation_status") WHERE "customer_order"."negotiation_status" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_order_item_uom" ON "order_item" USING btree ("uom_id");--> statement-breakpoint
ALTER TABLE "customer_order" ADD CONSTRAINT "ck_customer_order_quoted_total" CHECK ("customer_order"."quoted_total" >= 0);--> statement-breakpoint
ALTER TABLE "order_item" ADD CONSTRAINT "ck_order_item_complexity_score" CHECK ("order_item"."complexity_score" BETWEEN 1 AND 5);--> statement-breakpoint
ALTER TABLE "order_item" ADD CONSTRAINT "ck_order_item_tier_count" CHECK ("order_item"."tier_count" > 0);