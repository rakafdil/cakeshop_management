# Cakeshop Management Platform

Bakery business management platform (monorepo). Admin dashboard + public order tracking on the web, backed by a Hono (Bun) API and PostgreSQL via Drizzle.

> Scope note: this repo currently contains the **infrastructure scaffold only** — routing, authentication (JWT + httpOnly cookies), CSRF, rate limiting, validation, error handling, and the database schema. **Business logic is intentionally not implemented yet**; API handlers are skeletons returning `501 Not Implemented` where domain behavior will live.

## Repo layout

| Path | Purpose |
| --- | --- |
| `apps/web` | Next.js admin dashboard + customer tracking page |
| `apps/api` | Hono (Bun) REST API |
| `packages/database` | Drizzle schema + migrations (single source of truth for the DB) |
| `packages/shared-schemas` | Zod schemas / types shared by FE & BE |
| `packages/config` | Shared TS config presets |
| `packages/ui` | Reusable React components (placeholder) |
| `docs` | Architecture, routes, auth, security, setup docs |

## Prerequisites

- [Bun](https://bun.sh) >= 1.3
- Docker (for the local PostgreSQL) or a reachable PostgreSQL 16+

## Quick start

```bash
# 1. install dependencies
bun install

# 2. start PostgreSQL (docker-compose) -> postgres://user:password@localhost:5432/cakeshop
docker compose up -d db

# 3. apply migrations + seed an admin user
bun run db:migrate
bun --filter @bakery/api seed

# 4. run web + api in dev
bun run dev
```

- API: http://localhost:4000 (health: `GET /api/health`)
- Web: http://localhost:3000

See [docs/setup.md](docs/setup.md) for details and [docs/](docs/README.md) for the full documentation index.

## Scripts

```bash
bun run dev          # start web + api (turbo)
bun run build        # build all apps
bun run lint         # lint all packages
bun run typecheck    # typecheck all packages
bun run test         # run tests (apps/api) — SRS traceability, lihat docs/test-plan.md
bun --filter @bakery/api seed   # seed admin user
bun run db:generate  # regenerate Drizzle migrations
bun run db:migrate   # apply migrations
bun run db:studio    # open Drizzle Studio
```