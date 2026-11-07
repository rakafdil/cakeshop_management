import { Hono } from "hono";
import {
  CreateIngredientPriceHistoryInputSchema,
  CreateIngredientSchema,
  CreateLaborRateSchema,
  CreateProductCategorySchema,
  CreateProductSchema,
  CreateRecipeImageInputSchema,
  CreateRecipeIngredientInputSchema,
  CreateRecipeSchema,
  CreateRecipeToolInputSchema,
  CreateToolSchema,
  CreateUomSchema,
  idParamSchema,
  IngredientPriceHistoryQuerySchema,
  IngredientResponseSchema,
  LaborRateResponseSchema,
  ProductCategoryResponseSchema,
  ProductListQuerySchema,
  RecipeResponseSchema,
  SetProductCategoriesInputSchema,
  ToolResponseSchema,
  UomResponseSchema,
  UpdateIngredientSchema,
  UpdateLaborRateSchema,
  UpdateProductCategorySchema,
  UpdateProductSchema,
  UpdateRecipeSchema,
  UpdateToolSchema,
  UpdateUomSchema,
} from "@bakery/shared-schemas";
import { autoCrud } from "../../lib/crud";
import { unimplemented } from "../../lib/errors";
import { zValid } from "../../lib/validators";
import { authenticate, type AppEnv } from "../../middleware/auth";
import {
  ingredient,
  laborRate,
  productCategory,
  recipe,
  tool,
  uom,
} from "@bakery/database/schema";

// Katalog: produk, kategori, resep, bahan baku (ingredient), satuan (UOM), alat, tarif tenaga kerja.
// Seluruh endpoint authenticated — belum ada bisnis logic (stub 501).

// Produk BUKAN resource CRUD reusable (tidak ada di tabel api-mapping.md
// bagian 3), jadi tidak memakai autoCrud. Kontraknya ada di bagian 5.1:
// - POST/PATCH: `categoryId` bukan kolom `product`; create menyimpan row
//   `product` lalu `product_category_map`, update mengganti category map
//   hanya bila diminta.
// - GET /:id, POST (201), PATCH: response `{ data: ProductDetail }` (JOIN).
// - GET list: `{ data: ProductSummary[], pagination }`.
// - DELETE: 204, relasi ikut terhapus sesuai FK.
export const productsRoutes = new Hono<AppEnv>();
productsRoutes.use("*", authenticate);
productsRoutes.get("/", zValid("query", ProductListQuerySchema), (c) =>
  unimplemented("list products belum diimplementasikan"),
);
productsRoutes.get("/:id", zValid("param", idParamSchema), (c) =>
  unimplemented("get product detail belum diimplementasikan"),
);
productsRoutes.post("/", zValid("json", CreateProductSchema), (c) =>
  unimplemented("create product belum diimplementasikan"),
);
productsRoutes.patch(
  "/:id",
  zValid("param", idParamSchema),
  zValid("json", UpdateProductSchema),
  (c) => unimplemented("update product belum diimplementasikan"),
);
productsRoutes.delete("/:id", zValid("param", idParamSchema), (c) =>
  unimplemented("delete product belum diimplementasikan"),
);

export const categoriesRoutes = autoCrud({
  label: "product-categories",
  table: productCategory,
  createSchema: CreateProductCategorySchema,
  updateSchema: UpdateProductCategorySchema,
  responseSchema: ProductCategoryResponseSchema,
  idColumn: productCategory.id,
  middleware: [authenticate],
});

export const recipesRoutes = autoCrud({
  label: "recipes",
  table: recipe,
  createSchema: CreateRecipeSchema,
  updateSchema: UpdateRecipeSchema,
  responseSchema: RecipeResponseSchema,
  idColumn: recipe.id,
  middleware: [authenticate],
});

export const ingredientsRoutes = autoCrud({
  label: "ingredients",
  table: ingredient,
  createSchema: CreateIngredientSchema,
  updateSchema: UpdateIngredientSchema,
  responseSchema: IngredientResponseSchema,
  idColumn: ingredient.id,
  middleware: [authenticate],
});

export const uomRoutes = autoCrud({
  label: "uoms",
  table: uom,
  idColumn: uom.id,
  createSchema: CreateUomSchema,
  updateSchema: UpdateUomSchema,
  responseSchema: UomResponseSchema,
  middleware: [authenticate],
});

export const toolRoutes = autoCrud({
  label: "tools",
  table: tool,
  createSchema: CreateToolSchema,
  updateSchema: UpdateToolSchema,
  responseSchema: ToolResponseSchema,
  idColumn: tool.id,
  middleware: [authenticate],
});

export const laborRateRoutes = autoCrud({
  label: "labor-rates",
  table: laborRate,
  createSchema: CreateLaborRateSchema,
  updateSchema: UpdateLaborRateSchema,
  responseSchema: LaborRateResponseSchema,
  idColumn: laborRate.id,
  middleware: [authenticate],
});

// --- relasi & sub-resource ---

// pasang kategori ke sebuah produk (replace product_category_map, transactional)
export const productCategoriesRoutes = new Hono<AppEnv>();
productCategoriesRoutes.use("*", authenticate);
productCategoriesRoutes.put(
  "/:id/categories",
  zValid("param", idParamSchema),
  zValid("json", SetProductCategoriesInputSchema),
  (c) => unimplemented("set product categories belum diimplementasikan"),
);

// riwayat harga per bahan baku
export const ingredientPriceHistoryRoutes = new Hono<AppEnv>();
ingredientPriceHistoryRoutes.use("*", authenticate);
ingredientPriceHistoryRoutes.get(
  "/:id/price-history",
  zValid("param", idParamSchema),
  zValid("query", IngredientPriceHistoryQuerySchema),
  (c) => unimplemented("ingredient price history belum diimplementasikan"),
);
ingredientPriceHistoryRoutes.post(
  "/:id/price-history",
  zValid("param", idParamSchema),
  zValid("json", CreateIngredientPriceHistoryInputSchema),
  (c) => unimplemented("record ingredient price belum diimplementasikan"),
);

// child relation resep: bahan, alat, gambar (belum ada route di app.ts)
export const recipeChildrenRoutes = new Hono<AppEnv>();
recipeChildrenRoutes.use("*", authenticate);

recipeChildrenRoutes.get(
  "/:id/ingredients",
  zValid("param", idParamSchema),
  (c) => unimplemented("list recipe ingredients belum diimplementasikan"),
);
recipeChildrenRoutes.post(
  "/:id/ingredients",
  zValid("param", idParamSchema),
  zValid("json", CreateRecipeIngredientInputSchema),
  (c) => unimplemented("add recipe ingredient belum diimplementasikan"),
);

recipeChildrenRoutes.get("/:id/tools", zValid("param", idParamSchema), (c) =>
  unimplemented("list recipe tools belum diimplementasikan"),
);
recipeChildrenRoutes.post(
  "/:id/tools",
  zValid("param", idParamSchema),
  zValid("json", CreateRecipeToolInputSchema),
  (c) => unimplemented("add recipe tool belum diimplementasikan"),
);

recipeChildrenRoutes.get("/:id/images", zValid("param", idParamSchema), (c) =>
  unimplemented("list recipe images belum diimplementasikan"),
);
recipeChildrenRoutes.post(
  "/:id/images",
  zValid("param", idParamSchema),
  zValid("json", CreateRecipeImageInputSchema),
  (c) => unimplemented("add recipe image belum diimplementasikan"),
);
