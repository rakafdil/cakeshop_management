import { Hono } from 'hono';
import type { MiddlewareHandler } from 'hono';
import { idParamSchema, paginationSchema } from '@bakery/shared-schemas';
import { unimplemented } from './errors';
import { zValid } from './validators';
import type { AppEnv } from '../middleware/auth';

/**
 * Kerangka CRUD standar untuk sebuah resource.
 * Setiap handler masih berupa stub (501) — bisnis logic sengaja belum diimplementasikan.
 *
 * Routes yang dibuat:
 *   GET    /             -> list (pagination via query)
 *   POST   /             -> create
 *   GET    /:id          -> detail
 *   PATCH  /:id          -> update
 *   DELETE /:id          -> delete
 */
export function crud(
  label: string,
  ...middleware: MiddlewareHandler<AppEnv>[]
): Hono<AppEnv> {
  const r = new Hono<AppEnv>();
  if (middleware.length > 0) r.use('*', ...middleware);

  r.get('/', zValid('query', paginationSchema), (c) =>
    unimplemented(`${label}: list belum diimplementasikan`),
  );
  r.post('/', (c) => unimplemented(`${label}: create belum diimplementasikan`));
  r.get('/:id', zValid('param', idParamSchema), (c) =>
    unimplemented(`${label}: detail belum diimplementasikan`),
  );
  r.patch('/:id', zValid('param', idParamSchema), (c) =>
    unimplemented(`${label}: update belum diimplementasikan`),
  );
  r.delete('/:id', zValid('param', idParamSchema), (c) =>
    unimplemented(`${label}: delete belum diimplementasikan`),
  );

  return r;
}