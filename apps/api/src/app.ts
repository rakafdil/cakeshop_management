import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { corsOrigins, env } from './config/env';
import type { AppEnv } from './middleware/auth';
import { csrf } from './middleware/csrf';
import { rateLimit } from './middleware/rate-limit';
import { errorHandler, notFoundHandler } from './middleware/error-handler';

import { authRoutes } from './modules/auth/routes';
import { usersRoutes } from './modules/users/routes';
import { customersRoutes } from './modules/customers/routes';
import {
  productsRoutes,
  categoriesRoutes,
  recipesRoutes,
  ingredientsRoutes,
  ingredientPriceHistoryRoutes,
  productCategoriesRoutes,
  uomRoutes,
  toolRoutes,
  laborRateRoutes,
} from './modules/catalog/routes';
import {
  productionRoutes,
  productionSlotRoutes,
  stockTransactionRoutes,
  stockAlertRoutes,
  productionStockRoutes,
  stockAlertResolveRoutes,
} from './modules/production/routes';
import {
  orderRoutes,
  orderItemRoutes,
  orderStatusHistoryRoutes,
  orderReviewRoutes,
  orderReminderRoutes,
  orderPaymentRoutes,
  orderProductionSlotRoutes,
} from './modules/order/routes';
import { trackingRoutes } from './modules/tracking/routes';
import {
  paymentRoutes,
  financialTransactionRoutes,
  productCostRoutes,
  pricingRuleRoutes,
  productPriceRoutes,
  salesForecastRoutes,
} from './modules/finance/routes';
import { contentRoutes, valuePropositionRoutes, portfolioRoutes } from './modules/marketing/routes';
import { dashboardRoutes } from './modules/dashboard/routes';

export const app = new Hono<AppEnv>();

// --- middleware global ---
app.use('*', logger());
app.use('*', secureHeaders());
app.use(
  '/api/*',
  cors({
    origin: corsOrigins,
    credentials: true, // cookie httpOnly ikut terkirim lintas origin
    allowHeaders: ['Content-Type', 'X-CSRF-Token'],
  }),
);
app.use(
  '/api/*',
  rateLimit({ max: env.RATE_LIMIT_MAX, windowMs: env.RATE_LIMIT_WINDOW_MS }),
);
// CSRF double-submit untuk semua method tulis; /api/auth dikecualikan (login belum punya cookie).
app.use('/api/*', csrf({ exempt: (c) => c.req.path.startsWith('/api/auth') }));

// --- health ---
app.get('/api/health', (c) =>
  c.json({ status: 'ok', service: 'cakeshop-api', time: new Date().toISOString() }),
);

// --- modul routing ---
app.route('/api/auth', authRoutes);
app.route('/api/users', usersRoutes);
app.route('/api/customers', customersRoutes);

// catalog
app.route('/api/products', productsRoutes);
app.route('/api/products', productCategoriesRoutes);
app.route('/api/product-categories', categoriesRoutes);
app.route('/api/recipes', recipesRoutes);
app.route('/api/ingredients', ingredientsRoutes);
app.route('/api/ingredients', ingredientPriceHistoryRoutes);
app.route('/api/uoms', uomRoutes);
app.route('/api/tools', toolRoutes);
app.route('/api/labor-rates', laborRateRoutes);

// production & inventory
app.route('/api/production', productionRoutes);
app.route('/api/production', productionStockRoutes);
app.route('/api/production-slots', productionSlotRoutes);
app.route('/api/stock-transactions', stockTransactionRoutes);
app.route('/api/stock-alerts', stockAlertRoutes);
app.route('/api/stock-alerts', stockAlertResolveRoutes);

// order & fulfillment
app.route('/api/orders', orderRoutes);
app.route('/api/orders', orderItemRoutes);
app.route('/api/orders', orderStatusHistoryRoutes);
app.route('/api/orders', orderReviewRoutes);
app.route('/api/orders', orderReminderRoutes);
app.route('/api/orders', orderPaymentRoutes);
app.route('/api/orders', orderProductionSlotRoutes);

// tracking publik
app.route('/api/tracking', trackingRoutes);

// finance
app.route('/api/payments', paymentRoutes);
app.route('/api/financial-transactions', financialTransactionRoutes);
app.route('/api/product-costs', productCostRoutes);
app.route('/api/pricing-rules', pricingRuleRoutes);
app.route('/api/product-prices', productPriceRoutes);
app.route('/api/sales-forecasts', salesForecastRoutes);

// marketing
app.route('/api/content', contentRoutes);
app.route('/api/value-propositions', valuePropositionRoutes);
app.route('/api/portfolio', portfolioRoutes);

// dashboard
app.route('/api/dashboard', dashboardRoutes);

app.notFound(notFoundHandler);
app.onError(errorHandler);