import { Hono } from "hono";
import {
  createUomSchema,
  idParamSchema,
  paginationSchema,
  uomResponseSchema,
  updateUomSchema,
} from "@bakery/shared-schemas";
import { autoCrud } from "../../lib/crud";
import { unimplemented } from "../../lib/errors";
import { zValid } from "../../lib/validators";
import { authenticate, type AppEnv } from "../../middleware/auth";
import {
  ingredient,
  laborRate,
  product,
  productCategory,
  recipe,
  tool,
  uom,
} from "@bakery/database/schema";

// Katalog: produk, kategori, resep, bahan baku (ingredient), satuan (UOM), alat, tarif tenaga kerja.
// Seluruh endpoint authenticated — belum ada bisnis logic (stub 501).

export const productsRoutes = autoCrud({
  label: "products",
  table: product,
  idColumn: product.id,
  middleware: [authenticate],
});

export const categoriesRoutes = autoCrud({
  label: "product-categories",
  table: productCategory,
  idColumn: productCategory.id,
  middleware: [authenticate],
});

export const recipesRoutes = autoCrud({
  label: "recipes",
  table: recipe,
  idColumn: recipe.id,
  middleware: [authenticate],
});

export const ingredientsRoutes = autoCrud({
  label: "ingredients",
  table: ingredient,
  idColumn: ingredient.id,
  middleware: [authenticate],
});

export const uomRoutes = autoCrud({
  label: "uoms",
  table: uom,
  idColumn: uom.id,
  createSchema: createUomSchema,
  updateSchema: updateUomSchema,
  responseSchema: uomResponseSchema,
  middleware: [authenticate],
});

export const toolRoutes = autoCrud({
  label: "tools",
  table: tool,
  idColumn: tool.id,
  middleware: [authenticate],
});

export const laborRateRoutes = autoCrud({
  label: "labor-rates",
  table: laborRate,
  idColumn: laborRate.id,
  middleware: [authenticate],
});

// --- relasi & sub-resource ---

// pasang kategori ke sebuah produk
export const productCategoriesRoutes = new Hono<AppEnv>();
productCategoriesRoutes.use("*", authenticate);
productCategoriesRoutes.put(
  "/:id/categories",
  zValid("param", idParamSchema),
  (c) => unimplemented("set product categories belum diimplementasikan"),
);

// riwayat harga per bahan baku
export const ingredientPriceHistoryRoutes = new Hono<AppEnv>();
ingredientPriceHistoryRoutes.use("*", authenticate);
ingredientPriceHistoryRoutes.get(
  "/:id/price-history",
  zValid("param", idParamSchema),
  zValid("query", paginationSchema),
  (c) => unimplemented("ingredient price history belum diimplementasikan"),
);
ingredientPriceHistoryRoutes.post(
  "/:id/price-history",
  zValid("param", idParamSchema),
  (c) => unimplemented("record ingredient price belum diimplementasikan"),
);
