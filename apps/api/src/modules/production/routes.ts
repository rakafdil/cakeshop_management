import { Hono } from 'hono';
import { idParamSchema, paginationSchema } from '@bakery/shared-schemas';
import { crud } from '../../lib/crud';
import { unimplemented } from '../../lib/errors';
import { zValid } from '../../lib/validators';
import { authenticate, type AppEnv } from '../../middleware/auth';

// Produksi & inventori: batch produksi, slot produksi, transaksi stok, peringatan stok.

export const productionRoutes = crud('production', authenticate);

export const productionSlotRoutes = crud('production-slots', authenticate);

export const stockTransactionRoutes = crud('stock-transactions', authenticate);

export const stockAlertRoutes = crud('stock-alerts', authenticate);

// --- sub-resource ---

// transaksi stok yang menempel pada satu batch produksi
export const productionStockRoutes = new Hono<AppEnv>();
productionStockRoutes.use('*', authenticate);
productionStockRoutes.get(
  '/:id/stock-transactions',
  zValid('param', idParamSchema),
  zValid('query', paginationSchema),
  (c) => unimplemented('production stock transactions belum diimplementasikan'),
);

// tandai peringatan stok selesai
export const stockAlertResolveRoutes = new Hono<AppEnv>();
stockAlertResolveRoutes.use('*', authenticate);
stockAlertResolveRoutes.patch('/:id/resolve', zValid('param', idParamSchema), (c) =>
  unimplemented('resolve stock alert belum diimplementasikan'),
);