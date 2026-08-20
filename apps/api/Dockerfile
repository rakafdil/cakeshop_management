FROM oven/bun:1.2.20-alpine AS base
WORKDIR /app

# --- deps: install seluruh workspace monorepo ---
FROM base AS deps
COPY package.json bun.lock turbo.json tsconfig.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/api/package.json apps/api/package.json
COPY packages/database/package.json packages/database/package.json
COPY packages/shared-schemas/package.json packages/shared-schemas/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/ui/package.json packages/ui/package.json
RUN bun install --frozen-lockfile

# --- runner ---
FROM base AS runner
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/packages/database/node_modules ./packages/database/node_modules
COPY --from=deps /app/packages/shared-schemas/node_modules ./packages/shared-schemas/node_modules

COPY . .

WORKDIR /app/apps/api
EXPOSE 4000
CMD ["bun", "run", "start"]