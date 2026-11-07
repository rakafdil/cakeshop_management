import { z } from "zod";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import {
  ingredient,
  ingredientPriceHistory,
  laborRate,
  portfolio,
  product,
  productCategory,
  recipe,
  recipeImage,
  recipeIngredient,
  recipeTool,
  tool,
  uom,
  uomConversion,
  valuePropositionTemplate,
} from "@bakery/database/schema";
import {
  dateOnlySchema,
  decimalString,
  itemResponse,
  listResponse,
  paginationSchema,
  positiveDecimalString,
  uuidField,
} from "./common";

// Catalog DTOs (api-mapping.md, bagian 5).
// - Kolom tabel diturunkan dari Drizzle schema (single source of truth).
// - Create*/Update* hanya berisi kolom writable (.pick); id, timestamps, dan
//   generated column (tool.costPerUse) tidak ikut, jadi key itu di-strip zod.
// - Decimal selalu string (lihat decimalString di common.ts), bukan number.
// - Primitive/envelope bersama (uuid, decimal, pagination, itemResponse,
//   listResponse) ada di common.ts.

// ---------------------------------------------------------------------------
// 5.2 Product category
// ---------------------------------------------------------------------------

export const ProductCategorySchema = createSelectSchema(productCategory);

// Body: { name, description? }
export const CreateProductCategorySchema = createInsertSchema(productCategory, {
  name: (s) => s.trim().min(1, "Nama kategori wajib diisi"),
}).pick({
  name: true,
  description: true,
});

export const UpdateProductCategorySchema =
  CreateProductCategorySchema.partial();

// PUT /api/products/:id/categories
export const SetProductCategoriesInputSchema = z.object({
  categoryIds: z.array(uuidField("Category ID")),
});

// ---------------------------------------------------------------------------
// 5.5 UOM dan konversi
// ---------------------------------------------------------------------------

export const UomSchema = createSelectSchema(uom);

// Body: { name, symbol, type }; PATCH partial.
export const CreateUomSchema = createInsertSchema(uom, {
  name: (s) => s.trim().min(1, "Nama UOM wajib diisi"),
  symbol: (s) => s.trim().min(1, "Simbol UOM wajib diisi"),
}).pick({
  name: true,
  symbol: true,
  type: true,
});

export const UpdateUomSchema = CreateUomSchema.partial();

// uom_conversion belum punya endpoint (bagian 13); dipakai saat konversi unit
// resep -> unit pembelian.
export const UomConversionSchema = createSelectSchema(uomConversion);

export const CreateUomConversionSchema = createInsertSchema(uomConversion, {
  fromUomId: () => uuidField("From UOM ID"),
  toUomId: () => uuidField("To UOM ID"),
  conversionFactor: () => positiveDecimalString("Faktor konversi"),
})
  .pick({
    fromUomId: true,
    toUomId: true,
    conversionFactor: true,
  })
  .refine((data) => data.fromUomId !== data.toUomId, {
    message: "UOM asal dan tujuan tidak boleh sama",
    path: ["toUomId"],
  });

// ---------------------------------------------------------------------------
// 5.6 Tool
// ---------------------------------------------------------------------------

// costPerUse = purchase_cost / useful_life -> generated column, read-only.
export const ToolSchema = createSelectSchema(tool);

// Body: { name, purchaseCost, usefulLife }
export const CreateToolSchema = createInsertSchema(tool, {
  name: (s) => s.trim().min(1, "Nama tool wajib diisi"),
  purchaseCost: () => decimalString("Biaya pembelian"),
  // usefulLife jadi pembagi costPerUse, jadi harus > 0.
  usefulLife: () => z.number().int().positive("Masa pakai harus lebih dari 0"),
}).pick({
  name: true,
  purchaseCost: true,
  usefulLife: true,
});

export const UpdateToolSchema = CreateToolSchema.partial();

// ---------------------------------------------------------------------------
// 5.7 Labor rate
// ---------------------------------------------------------------------------

export const LaborRateSchema = createSelectSchema(laborRate);

// Body: { ratePerHour, effectiveDate }
export const CreateLaborRateSchema = createInsertSchema(laborRate, {
  ratePerHour: () => positiveDecimalString("Tarif per jam"),
  effectiveDate: () => dateOnlySchema("tanggal efektif"),
}).pick({
  ratePerHour: true,
  effectiveDate: true,
});

export const UpdateLaborRateSchema = CreateLaborRateSchema.partial();

// ---------------------------------------------------------------------------
// 5.4 Ingredient + price history
// ---------------------------------------------------------------------------

export const IngredientSchema = createSelectSchema(ingredient);

// Body: { name, purchaseUomId, currentStock?, minimumStock?, isActive? }
export const CreateIngredientSchema = createInsertSchema(ingredient, {
  name: (s) => s.trim().min(1, "Nama bahan wajib diisi"),
  purchaseUomId: () => uuidField("Purchase UOM ID"),
  currentStock: () => decimalString("Stok saat ini"),
  minimumStock: () => decimalString("Stok minimum"),
}).pick({
  name: true,
  purchaseUomId: true,
  currentStock: true,
  minimumStock: true,
  isActive: true,
});

export const UpdateIngredientSchema = CreateIngredientSchema.partial();

export const IngredientPriceHistorySchema = createSelectSchema(
  ingredientPriceHistory,
);

// POST /api/ingredients/:id/price-history -> { price }
// ingredientId dari path; previousPrice & changedAt diisi server.
export const CreateIngredientPriceHistoryInputSchema = z.object({
  price: decimalString("Harga"),
});

// GET /api/ingredients/:id/price-history -> query pagination (tanpa q)
export const IngredientPriceHistoryQuerySchema = paginationSchema.pick({
  page: true,
  pageSize: true,
});

// ---------------------------------------------------------------------------
// 5.3 Recipe + child relations
// ---------------------------------------------------------------------------

export const RecipeSchema = createSelectSchema(recipe);

// Body: { productId, version, preparationSteps, difficultyLevel,
//         estimatedLaborMinutes, isComplete }
// version unik per product -> pelanggaran dikembalikan 409 CONFLICT oleh service.
export const CreateRecipeSchema = createInsertSchema(recipe, {
  productId: () => uuidField("Product ID"),
  difficultyLevel: (s) =>
    s
      .min(1, "Tingkat kesulitan minimal 1")
      .max(5, "Tingkat kesulitan maksimal 5"),
  estimatedLaborMinutes: () => decimalString("Estimasi waktu kerja"),
}).pick({
  productId: true,
  version: true,
  preparationSteps: true,
  difficultyLevel: true,
  estimatedLaborMinutes: true,
  isComplete: true,
});

export const UpdateRecipeSchema = CreateRecipeSchema.partial();

export const RecipeIngredientSchema = createSelectSchema(recipeIngredient);
export const RecipeToolSchema = createSelectSchema(recipeTool);
export const RecipeImageSchema = createSelectSchema(recipeImage);

// POST /api/recipes/:id/ingredients (belum ada route)
export const CreateRecipeIngredientInputSchema = z.object({
  ingredientId: uuidField("Ingredient ID"),
  quantity: positiveDecimalString("Jumlah bahan"),
  uomId: uuidField("UOM ID"),
  notes: z.string().trim().optional().nullable(),
});

// POST /api/recipes/:id/tools
export const CreateRecipeToolInputSchema = z.object({
  toolId: uuidField("Tool ID"),
  quantity: z
    .number()
    .int()
    .positive("Jumlah tool harus lebih dari 0")
    .optional(),
});

// POST /api/recipes/:id/images
export const CreateRecipeImageInputSchema = z.object({
  imageUrl: z.string().trim().min(1, "URL gambar wajib diisi"),
  caption: z.string().trim().optional().nullable(),
});

// GET /api/recipes/:id/ingredients (JOIN ingredient, uom)
export const RecipeIngredientDetailSchema = RecipeIngredientSchema.extend({
  ingredient: IngredientSchema,
  uom: UomSchema,
});

// GET /api/recipes/:id/tools (JOIN tool)
export const RecipeToolDetailSchema = RecipeToolSchema.extend({
  tool: ToolSchema,
});

// GET /api/recipes/:id -> recipe + child relation
export const RecipeDetailSchema = RecipeSchema.extend({
  ingredients: z.array(RecipeIngredientDetailSchema),
  tools: z.array(RecipeToolDetailSchema),
  images: z.array(RecipeImageSchema),
});

// ---------------------------------------------------------------------------
// 5.1 Product
// ---------------------------------------------------------------------------

export const ProductSchema = createSelectSchema(product);

// GET /api/products -> item list; kategori & relasi hanya ada di detail.
export const ProductSummarySchema = ProductSchema.pick({
  id: true,
  name: true,
  description: true,
  productionType: true,
  fulfillmentType: true,
  marketSegment: true,
  basePrice: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
});

// GET /api/products?page&pageSize&q
export const ProductListQuerySchema = paginationSchema;

// POST /api/products
// categoryId BUKAN kolom `product`: service insert `product`, lalu
// `product_category_map`. basePrice dikelola server pada endpoint generik, tapi
// tetap ada di CreateProductRequest, jadi dibuat opsional (string decimal).
export const CreateProductSchema = createInsertSchema(product, {
  name: (s) => s.trim().min(1, "Nama produk wajib diisi"),
  basePrice: () => decimalString("Harga dasar"),
})
  .pick({
    name: true,
    description: true,
    productionType: true,
    fulfillmentType: true,
    marketSegment: true,
    basePrice: true,
    isActive: true, // default true
  })
  .extend({
    categoryId: uuidField("Category ID").optional(),
  });

// PATCH /api/products/:id -> partial; category map diganti hanya bila categoryId dikirim.
export const UpdateProductSchema = CreateProductSchema.partial();

// PUT /api/products/:id/value-propositions (belum ada route, lihat bagian 10)
export const SetProductValuePropositionsInputSchema = z.object({
  templateIds: z.array(uuidField("Template ID")),
});

// Field: id, title, content, isActive, createdAt
export const ValuePropositionSchema = createSelectSchema(
  valuePropositionTemplate,
);
// Field: id, productId, description, imageUrl, workDate, createdAt
export const PortfolioSchema = createSelectSchema(portfolio);

// GET /api/products/:id (juga response POST 201 dan PATCH)
export const ProductDetailSchema = ProductSummarySchema.extend({
  category: ProductCategorySchema.nullable(),
  categories: z.array(ProductCategorySchema),
  recipes: z.array(RecipeDetailSchema),
  valuePropositions: z.array(ValuePropositionSchema),
  portfolio: z.array(PortfolioSchema),
});

// ---------------------------------------------------------------------------
// Responses
// Item  -> GET /:id, POST (201), PATCH : { data }
// List  -> GET /                       : { data[], pagination }
// DELETE mengembalikan 204 tanpa body, jadi tidak ada schema-nya.
// ---------------------------------------------------------------------------

// Product
export const ProductListResponseSchema = listResponse(ProductSummarySchema);
export const ProductResponseSchema = itemResponse(ProductDetailSchema);
// PUT /api/products/:id/categories
export const ProductCategoriesResponseSchema = itemResponse(
  z.array(ProductCategorySchema),
);
// PUT /api/products/:id/value-propositions
export const ProductValuePropositionsResponseSchema = itemResponse(
  z.array(ValuePropositionSchema),
);

// Product category
export const ProductCategoryResponseSchema = itemResponse(
  ProductCategorySchema,
);
export const ProductCategoryListResponseSchema = listResponse(
  ProductCategorySchema,
);

// Recipe (list pakai row recipe; detail menyertakan child)
export const RecipeResponseSchema = itemResponse(RecipeDetailSchema);
export const RecipeListResponseSchema = listResponse(RecipeSchema);

// Recipe child: GET -> { data[] } tanpa pagination; POST -> 201 { data }
export const RecipeIngredientsResponseSchema = itemResponse(
  z.array(RecipeIngredientDetailSchema),
);
export const RecipeIngredientResponseSchema = itemResponse(
  RecipeIngredientSchema,
);
export const RecipeToolsResponseSchema = itemResponse(
  z.array(RecipeToolDetailSchema),
);
export const RecipeToolResponseSchema = itemResponse(RecipeToolSchema);
export const RecipeImagesResponseSchema = itemResponse(
  z.array(RecipeImageSchema),
);
export const RecipeImageResponseSchema = itemResponse(RecipeImageSchema);

// Ingredient
export const IngredientResponseSchema = itemResponse(IngredientSchema);
export const IngredientListResponseSchema = listResponse(IngredientSchema);

// Ingredient price history
export const IngredientPriceHistoryResponseSchema = itemResponse(
  IngredientPriceHistorySchema,
);
export const IngredientPriceHistoryListResponseSchema = listResponse(
  IngredientPriceHistorySchema,
);

// UOM
export const UomResponseSchema = itemResponse(UomSchema);
export const UomListResponseSchema = listResponse(UomSchema);

// Tool
export const ToolResponseSchema = itemResponse(ToolSchema);
export const ToolListResponseSchema = listResponse(ToolSchema);

// Labor rate
export const LaborRateResponseSchema = itemResponse(LaborRateSchema);
export const LaborRateListResponseSchema = listResponse(LaborRateSchema);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

// Product
export type ProductDto = z.infer<typeof ProductSchema>;
export type ProductSummaryDto = z.infer<typeof ProductSummarySchema>;
export type ProductDetailDto = z.infer<typeof ProductDetailSchema>;
export type CreateProductDto = z.infer<typeof CreateProductSchema>;
export type UpdateProductDto = z.infer<typeof UpdateProductSchema>;
export type SetProductCategoriesInput = z.infer<
  typeof SetProductCategoriesInputSchema
>;
export type SetProductValuePropositionsInput = z.infer<
  typeof SetProductValuePropositionsInputSchema
>;
export type ProductResponse = z.infer<typeof ProductResponseSchema>;
export type ProductListResponse = z.infer<typeof ProductListResponseSchema>;

// Product category
export type ProductCategoryDto = z.infer<typeof ProductCategorySchema>;
export type CreateProductCategoryDto = z.infer<
  typeof CreateProductCategorySchema
>;
export type UpdateProductCategoryDto = z.infer<
  typeof UpdateProductCategorySchema
>;
export type ProductCategoryResponse = z.infer<
  typeof ProductCategoryResponseSchema
>;
export type ProductCategoryListResponse = z.infer<
  typeof ProductCategoryListResponseSchema
>;

// Recipe
export type RecipeDto = z.infer<typeof RecipeSchema>;
export type RecipeDetailDto = z.infer<typeof RecipeDetailSchema>;
export type CreateRecipeDto = z.infer<typeof CreateRecipeSchema>;
export type UpdateRecipeDto = z.infer<typeof UpdateRecipeSchema>;
export type CreateRecipeIngredientInput = z.infer<
  typeof CreateRecipeIngredientInputSchema
>;
export type CreateRecipeToolInput = z.infer<typeof CreateRecipeToolInputSchema>;
export type CreateRecipeImageInput = z.infer<
  typeof CreateRecipeImageInputSchema
>;
export type RecipeResponse = z.infer<typeof RecipeResponseSchema>;
export type RecipeListResponse = z.infer<typeof RecipeListResponseSchema>;

// Ingredient
export type IngredientDto = z.infer<typeof IngredientSchema>;
export type CreateIngredientDto = z.infer<typeof CreateIngredientSchema>;
export type UpdateIngredientDto = z.infer<typeof UpdateIngredientSchema>;
export type IngredientResponse = z.infer<typeof IngredientResponseSchema>;
export type IngredientListResponse = z.infer<
  typeof IngredientListResponseSchema
>;
export type IngredientPriceHistoryDto = z.infer<
  typeof IngredientPriceHistorySchema
>;
export type CreateIngredientPriceHistoryInput = z.infer<
  typeof CreateIngredientPriceHistoryInputSchema
>;

// UOM
export type UomDto = z.infer<typeof UomSchema>;
export type CreateUomDto = z.infer<typeof CreateUomSchema>;
export type UpdateUomDto = z.infer<typeof UpdateUomSchema>;
export type UomResponse = z.infer<typeof UomResponseSchema>;
export type UomListResponse = z.infer<typeof UomListResponseSchema>;
export type UomConversionDto = z.infer<typeof UomConversionSchema>;
export type CreateUomConversionDto = z.infer<typeof CreateUomConversionSchema>;

// Tool
export type ToolDto = z.infer<typeof ToolSchema>;
export type CreateToolDto = z.infer<typeof CreateToolSchema>;
export type UpdateToolDto = z.infer<typeof UpdateToolSchema>;
export type ToolResponse = z.infer<typeof ToolResponseSchema>;
export type ToolListResponse = z.infer<typeof ToolListResponseSchema>;

// Labor rate
export type LaborRateDto = z.infer<typeof LaborRateSchema>;
export type CreateLaborRateDto = z.infer<typeof CreateLaborRateSchema>;
export type UpdateLaborRateDto = z.infer<typeof UpdateLaborRateSchema>;
export type LaborRateResponse = z.infer<typeof LaborRateResponseSchema>;
export type LaborRateListResponse = z.infer<typeof LaborRateListResponseSchema>;
