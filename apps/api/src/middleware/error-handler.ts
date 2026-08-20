import type { ErrorHandler, NotFoundHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { ApiErrorBody } from '@bakery/shared-schemas';
import { ApiError } from '../lib/errors';

// Pengganti exception filter — semua error diserialisasi jadi { error: { code, message, details } }.

export const notFoundHandler: NotFoundHandler = (c) =>
  c.json<ApiErrorBody>(
    { error: { code: 'NOT_FOUND', message: 'Endpoint tidak ditemukan' } },
    404,
  );

export const errorHandler: ErrorHandler = (err, c) => {
  if (err instanceof ApiError) {
    return c.json<ApiErrorBody>(
      { error: { code: err.code, message: err.message, details: err.details } },
      err.status as ContentfulStatusCode,
    );
  }
  if (err instanceof HTTPException) {
    return c.json<ApiErrorBody>(
      { error: { code: 'HTTP_ERROR', message: err.message } },
      err.status,
    );
  }
  console.error('[app] unhandled error:', err);
  return c.json<ApiErrorBody>(
    { error: { code: 'INTERNAL_ERROR', message: 'Terjadi kesalahan pada server' } },
    500,
  );
};