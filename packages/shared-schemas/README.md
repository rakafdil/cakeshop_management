# @bakery/shared-schemas

Zod schemas and TypeScript types shared between the API and the web app. This is the source of truth for the HTTP contract (request validation + response shapes).

## Structure

```
src/
├── index.ts           # re-exports everything
├── schemas/
│   ├── common.ts      # uuid, id param, pagination
│   ├── auth.ts        # login + authenticated user
│   └── order.ts       # order DTOs (drizzle-zod)
└── types/
    └── api.ts         # ApiErrorBody, Paginated<T>, ApiErrorCode
```

## Usage

```ts
import { loginSchema, paginationSchema } from '@bakery/shared-schemas';
```

DTOs derived from the Drizzle schema (e.g. `OrderSchema`) are generated with `drizzle-zod`, so the database stays the single source of truth.

See `docs/api-routes.md` for how these schemas are wired into the API.
