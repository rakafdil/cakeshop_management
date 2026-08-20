import type { Context, MiddlewareHandler } from 'hono';
import { getCookie } from 'hono/cookie';
import { ApiError } from '../lib/errors';
import { CSRF_COOKIE } from '../lib/auth';

// CSRF double-submit token: setiap method tulis wajib mengirim header
// `X-CSRF-Token` yang nilainya sama dengan cookie `ck_csrf`.
// Endpoint /api/auth/* dikecualikan (login belum punya cookie CSRF).

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function csrf(opts?: {
  exempt?: (c: Context) => boolean;
}): MiddlewareHandler {
  return async (c, next) => {
    if (opts?.exempt?.(c)) return next();

    if (!SAFE_METHODS.has(c.req.method)) {
      const header = c.req.header('x-csrf-token');
      const cookie = getCookie(c, CSRF_COOKIE);
      if (!header || !cookie || header !== cookie) {
        throw new ApiError(403, 'CSRF_FAILED', 'Token CSRF tidak valid');
      }
    }
    await next();
  };
}