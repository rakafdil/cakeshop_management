import { Hono } from 'hono';
import { idParamSchema, paginationSchema } from '@bakery/shared-schemas';
import { crud } from '../../lib/crud';
import { unimplemented } from '../../lib/errors';
import { zValid } from '../../lib/validators';
import { authenticate, type AppEnv } from '../../middleware/auth';

// Order & fulfillment: order beserta sub-resourcenya (items, status history, review,
// reminder, payment, slot produksi).

export const orderRoutes = crud('orders', authenticate);

// --- sub-resource order ---

export const orderItemRoutes = new Hono<AppEnv>();
orderItemRoutes.use('*', authenticate);
orderItemRoutes.get(
  '/:id/items',
  zValid('param', idParamSchema),
  zValid('query', paginationSchema),
  (c) => unimplemented('order items belum diimplementasikan'),
);
orderItemRoutes.post('/:id/items', zValid('param', idParamSchema), (c) =>
  unimplemented('add order item belum diimplementasikan'),
);

export const orderStatusHistoryRoutes = new Hono<AppEnv>();
orderStatusHistoryRoutes.use('*', authenticate);
orderStatusHistoryRoutes.get(
  '/:id/status-history',
  zValid('param', idParamSchema),
  zValid('query', paginationSchema),
  (c) => unimplemented('order status history belum diimplementasikan'),
);

export const orderReviewRoutes = new Hono<AppEnv>();
orderReviewRoutes.use('*', authenticate);
orderReviewRoutes.get(
  '/:id/reviews',
  zValid('param', idParamSchema),
  (c) => unimplemented('order reviews belum diimplementasikan'),
);
orderReviewRoutes.post('/:id/reviews', zValid('param', idParamSchema), (c) =>
  unimplemented('create order review belum diimplementasikan'),
);

export const orderReminderRoutes = new Hono<AppEnv>();
orderReminderRoutes.use('*', authenticate);
orderReminderRoutes.get(
  '/:id/reminders',
  zValid('param', idParamSchema),
  (c) => unimplemented('order reminders belum diimplementasikan'),
);
orderReminderRoutes.post('/:id/reminders', zValid('param', idParamSchema), (c) =>
  unimplemented('schedule order reminder belum diimplementasikan'),
);

export const orderPaymentRoutes = new Hono<AppEnv>();
orderPaymentRoutes.use('*', authenticate);
orderPaymentRoutes.get(
  '/:id/payments',
  zValid('param', idParamSchema),
  (c) => unimplemented('order payments belum diimplementasikan'),
);
orderPaymentRoutes.post('/:id/payments', zValid('param', idParamSchema), (c) =>
  unimplemented('create order payment belum diimplementasikan'),
);

export const orderProductionSlotRoutes = new Hono<AppEnv>();
orderProductionSlotRoutes.use('*', authenticate);
orderProductionSlotRoutes.get(
  '/:id/production-slots',
  zValid('param', idParamSchema),
  (c) => unimplemented('order production slots belum diimplementasikan'),
);
orderProductionSlotRoutes.put('/:id/production-slots', zValid('param', idParamSchema), (c) =>
  unimplemented('reserve order production slots belum diimplementasikan'),
);