import type { MiddlewareHandler } from 'hono';
import { ApiError } from '../lib/errors';

// Rate limit in-memory per IP — cukup untuk single-instance.
// Konfigurasi per-grup (global vs auth) diberikan dari app.ts.

type Entry = { count: number; resetAt: number };

export function rateLimit(opts: { max: number; windowMs: number }): MiddlewareHandler {
  const hits = new Map<string, Entry>();

  return async (c, next) => {
    const ip =
      c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
      c.req.header('x-real-ip') ||
      'local';
    const now = Date.now();

    const entry = hits.get(ip);
    if (!entry || entry.resetAt <= now) {
      hits.set(ip, { count: 1, resetAt: now + opts.windowMs });
    } else {
      entry.count += 1;
      if (entry.count > opts.max) {
        throw new ApiError(429, 'RATE_LIMITED', 'Terlalu banyak permintaan, coba lagi nanti');
      }
    }

    // pembersihan ringan agar map tidak membesar tanpa batas
    if (hits.size > 10_000) {
      for (const [key, value] of hits) {
        if (value.resetAt <= now) hits.delete(key);
      }
    }

    await next();
  };
}