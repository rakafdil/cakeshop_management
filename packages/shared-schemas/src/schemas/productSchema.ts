
import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";

extendZodWithOpenApi(z);

export const productionTypeEnum = z
  .enum(["batch", "unit"])
  .openapi("ProductionType");

export const fulfillmentTypeEnum = z
  .enum(["pre_order", "ready_stock", "hybrid"])
  .openapi("FulfillmentType");

export const marketSegmentEnum = z
  .enum(["premium_artisan", "everyday_budget"])
  .openapi("MarketSegment");

export const createProductSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nama wajib diisi")
    .max(100, "Nama produk maksimal 100 karakter"),

  description: z
    .string()
    .trim()
    .min(1, "Deskripsi wajib diisi")
    .max(500, "Deskripsi maksimal 500 karakter"),

  categoryId: z
    .uuid(),

  productionType: productionTypeEnum,

  fulfillmentType: fulfillmentTypeEnum,

  marketSegment: marketSegmentEnum,
});

export type CreateProductInput = z.infer<
  typeof createProductSchema
>;
