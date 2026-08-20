import { Hono } from 'hono';
import { idParamSchema, paginationSchema } from '@bakery/shared-schemas';
import { crud } from '../../lib/crud';
import { unimplemented } from '../../lib/errors';
import { zValid } from '../../lib/validators';
import { authenticate, type AppEnv } from '../../middleware/auth';

// Katalog: produk, kategori, resep, bahan baku (ingredient), satuan (UOM), alat, tarif tenaga kerja.
// Seluruh endpoint authenticated — belum ada bisnis logic (stub 501).

export const productsRoutes = crud('products', authenticate);

export const categoriesRoutes = crud('product-categories', authenticate);

export const recipesRoutes = crud('recipes', authenticate);

export const ingredientsRoutes = crud('ingredients', authenticate);

export const uomRoutes = crud('uoms', authenticate);

export const toolRoutes = crud('tools', authenticate);

export const laborRateRoutes = crud('labor-rates', authenticate);

// --- relasi & sub-resource ---

// pasang kategori ke sebuah produk
export const productCategoriesRoutes = new Hono<AppEnv>();
productCategoriesRoutes.use('*', authenticate);
productCategoriesRoutes.put(
  '/:id/categories',
  zValid('param', idParamSchema),
  (c) => unimplemented('set product categories belum diimplementasikan'),
);

// riwayat harga per bahan baku
export const ingredientPriceHistoryRoutes = new Hono<AppEnv>();
ingredientPriceHistoryRoutes.use('*', authenticate);
ingredientPriceHistoryRoutes.get(
  '/:id/price-history',
  zValid('param', idParamSchema),
  zValid('query', paginationSchema),
  (c) => unimplemented('ingredient price history belum diimplementasikan'),
);
ingredientPriceHistoryRoutes.post(
  '/:id/price-history',
  zValid('param', idParamSchema),
  (c) => unimplemented('record ingredient price belum diimplementasikan'),
);