import { zValidator } from '@hono/zod-validator';
import type { MiddlewareHandler } from 'hono';
import type { ZodType } from 'zod';
import { ApiError } from './errors';
import type { AppEnv } from '../middleware/auth';

/**
 * Pembungkus zValidator yang diikat ke Env aplikasi (AppEnv).
 * zValidator dari @hono/zod-validator menghasilkan tipe Env generik yang tidak
 * bisa disatukan dengan Env berkustomisasi, jadi di-cast lewat `unknown`.
 *
 * Hook kustom dipakai agar error validasi diserialisasi lewat envelope seragam
 * { error: { code: 'VALIDATION_ERROR', message, details } } - bukan body bawaan
 * @hono/zod-validator yang formatnya berbeda.
 */
export function zValid(target: 'json' | 'query' | 'param', schema: ZodType): MiddlewareHandler<AppEnv> {
  return zValidator(target, schema, (result) => {
    if (!result.success) {
      throw new ApiError(
        400,
        'VALIDATION_ERROR',
        'Validasi gagal',
        result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      );
    }
  }) as unknown as MiddlewareHandler<AppEnv>;
}