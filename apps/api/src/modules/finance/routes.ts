import { crud } from '../../lib/crud';
import { requireRole } from '../../middleware/auth';

// Keuangan & pricing: pembayaran, transaksi keuangan, biaya produk (HPP),
// aturan margin, harga rekomendasi, dan peramalan penjualan.
// Seluruh endpoint khusus admin.

export const paymentRoutes = crud('payments', requireRole('admin'));

export const financialTransactionRoutes = crud('financial-transactions', requireRole('admin'));

export const productCostRoutes = crud('product-costs', requireRole('admin'));

export const pricingRuleRoutes = crud('pricing-rules', requireRole('admin'));

export const productPriceRoutes = crud('product-prices', requireRole('admin'));

export const salesForecastRoutes = crud('sales-forecasts', requireRole('admin'));