ALTER TABLE "product_media" RENAME COLUMN "media_url" TO "storage_key";--> statement-breakpoint
ALTER TABLE "product_media" DROP CONSTRAINT "product_media_product_id_products_id_fk";
--> statement-breakpoint
ALTER TABLE "product_media" ADD COLUMN "mime_type" varchar(100) NOT NULL;--> statement-breakpoint
ALTER TABLE "product_media" ADD COLUMN "thumbnail_key" varchar(2048);--> statement-breakpoint
ALTER TABLE "product_media" ADD COLUMN "duration" integer;--> statement-breakpoint
ALTER TABLE "product_media" ADD CONSTRAINT "product_media_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;