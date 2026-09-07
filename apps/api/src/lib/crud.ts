// apps/api/src/lib/crud.ts
import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { Hono } from 'hono';
import type { MiddlewareHandler } from 'hono';
import { db } from '@bakery/database';
import { eq, sql } from 'drizzle-orm';
import type { PgTable, PgColumn } from 'drizzle-orm/pg-core';
import { idParamSchema, paginationSchema } from '@bakery/shared-schemas';
import { notFound } from './errors';
import { unimplemented } from './errors';
import type { AppEnv } from '../middleware/auth';

/** Legacy module routes remain registered as explicit 501 stubs until their tables are wired. */
export function crud(label: string, middleware: MiddlewareHandler<AppEnv>) {
  const router = new Hono<AppEnv>();
  router.use('*', middleware);
  router.all('*', () => unimplemented(`${label} belum diimplementasikan`));
  return router;
}

export interface CrudOptions<TTable extends PgTable> {
  label: string;
  table: TTable;
  idColumn: PgColumn;
  createSchema?: z.ZodTypeAny;
  updateSchema?: z.ZodTypeAny;
  responseSchema?: z.ZodTypeAny;
  middleware?: MiddlewareHandler<AppEnv>[];
}

export function autoCrud<TTable extends PgTable>(options: CrudOptions<TTable>) {
  const {
    label,
    table,
    idColumn,
    createSchema,
    updateSchema,
    responseSchema,
    middleware = [],
  } = options;
  const router = new OpenAPIHono<AppEnv>();
  const itemResponseSchema = responseSchema
    ? z.object({ data: responseSchema })
    : undefined;
  const listResponseSchema = responseSchema
    ? z.object({
        data: z.array(responseSchema),
        pagination: z.object({
          page: z.number().int(),
          limit: z.number().int(),
          total: z.number().int(),
        }),
      })
    : undefined;

  if (middleware.length > 0) {
    router.use('*', ...middleware);
  }

  // 1. GET / (List with pagination)
  const listRoute = createRoute({
    method: 'get',
    path: '/',
    tags: [label],
    request: { query: paginationSchema },
    responses: {
      200: {
        description: `List of ${label}`,
        ...(listResponseSchema
          ? { content: { 'application/json': { schema: listResponseSchema } } }
          : {}),
      },
    },
  });

  router.openapi(listRoute, async (c) => {
    const { page = 1, pageSize = 20 } = c.req.valid('query');
    const offset = (page - 1) * pageSize;

    const [items, [{ count }]] = await Promise.all([
      db.select().from(table as any).limit(pageSize).offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(table as any),
    ]);

    return c.json({
      data: items,
      pagination: { page, limit: pageSize, total: Number(count) },
    });
  });

  // 2. GET /{id} (Detail)
  const getRoute = createRoute({
    method: 'get',
    path: '/{id}',
    tags: [label],
    request: { params: idParamSchema },
    responses: {
      200: {
        description: `${label} details`,
        ...(itemResponseSchema
          ? { content: { 'application/json': { schema: itemResponseSchema } } }
          : {}),
      },
    },
  });

  router.openapi(getRoute, async (c) => {
    const { id } = c.req.valid('param');
    const [item] = await db.select().from(table as any).where(eq(idColumn, id)).limit(1);
    if (!item) throw notFound(`${label} not found`);
    return c.json({ data: item });
  });

  // 3. POST / (Create)
  if (createSchema) {
    const createRouteConfig = createRoute({
      method: 'post',
      path: '/',
      tags: [label],
      request: { body: { content: { 'application/json': { schema: createSchema } } } },
      responses: {
        201: {
          description: `${label} created`,
          ...(itemResponseSchema
            ? { content: { 'application/json': { schema: itemResponseSchema } } }
            : {}),
        },
      },
    });

    router.openapi(createRouteConfig, async (c) => {
      const body = c.req.valid('json');
      const [created] = await db.insert(table).values(body as any).returning();
      return c.json({ data: created }, 201);
    });
  }

  // 4. PATCH /{id} (Update)
  if (updateSchema) {
    const updateRouteConfig = createRoute({
      method: 'patch',
      path: '/{id}',
      tags: [label],
      request: {
        params: idParamSchema,
        body: { content: { 'application/json': { schema: updateSchema } } },
      },
      responses: {
        200: {
          description: `${label} updated`,
          ...(itemResponseSchema
            ? { content: { 'application/json': { schema: itemResponseSchema } } }
            : {}),
        },
      },
    });

    router.openapi(updateRouteConfig, async (c) => {
      const { id } = c.req.valid('param');
      const body = c.req.valid('json');
      const [updated] = await db
        .update(table)
        .set(body as any)
        .where(eq(idColumn, id))
        .returning();

      if (!updated) throw notFound(`${label} not found`);
      return c.json({ data: updated });
    });
  }

  // 5. DELETE /{id} (Delete)
  const deleteRouteConfig = createRoute({
    method: 'delete',
    path: '/{id}',
    tags: [label],
    request: { params: idParamSchema },
    responses: { 204: { description: `${label} deleted` } },
  });

  router.openapi(deleteRouteConfig, async (c) => {
    const { id } = c.req.valid('param');
    const [deleted] = await db.delete(table).where(eq(idColumn, id)).returning();
    if (!deleted) throw notFound(`${label} not found`);
    return c.body(null, 204);
  });

  return router;
}