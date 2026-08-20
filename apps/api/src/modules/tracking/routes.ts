import { Hono } from 'hono';
import { z } from 'zod';
import { unimplemented } from '../../lib/errors';
import { zValid } from '../../lib/validators';
import type { AppEnv } from '../../middleware/auth';

// Pelacakan order publik (tanpa login). Customer mengecek status pesanannya
// memakai tracking token yang dikirim lewat email/WhatsApp.
// Sumber data: customer_order.tracking_token.

export const trackingRoutes = new Hono<AppEnv>();

const trackingParams = z.object({
  token: z.string().trim().min(8, 'Tracking token tidak valid'),
});

trackingRoutes.get('/:token', zValid('param', trackingParams), (c) =>
  unimplemented('tracking order belum diimplementasikan'),
);