import { Hono } from 'hono';
import { unimplemented } from '../../lib/errors';
import { requireRole, type AppEnv } from '../../middleware/auth';

// Dashboard admin — agregasi ringkas (belum diimplementasikan).

export const dashboardRoutes = new Hono<AppEnv>();

dashboardRoutes.use('*', requireRole('admin'));

dashboardRoutes.get('/summary', (c) =>
  unimplemented('dashboard summary belum diimplementasikan'),
);