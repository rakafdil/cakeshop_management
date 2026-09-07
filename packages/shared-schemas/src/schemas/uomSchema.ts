// packages/shared-schemas/src/schemas/uom.ts
import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";

extendZodWithOpenApi(z);

export const uomTypeEnum = z
  .enum(["weight", "volume", "count", "other"])
  .openapi("UomType");

export const createUomSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Nama satuan wajib diisi")
      .max(50, "Nama satuan maksimal 50 karakter"),
    symbol: z
      .string()
      .trim()
      .min(1, "Simbol wajib diisi")
      .max(10, "Simbol maksimal 10 karakter"),
    type: uomTypeEnum,
  })
  .openapi("CreateUom");

// Update schema makes all fields optional for PATCH requests
export const updateUomSchema = createUomSchema.partial().openapi("UpdateUom");

// Select / response schema
export const uomResponseSchema = createUomSchema
  .extend({
    id: z.string().uuid(),
  })
  .openapi("Uom");

// Export TypeScript types
export type CreateUomDto = z.infer<typeof createUomSchema>;
export type UpdateUomDto = z.infer<typeof updateUomSchema>;
export type UomDto = z.infer<typeof uomResponseSchema>;
