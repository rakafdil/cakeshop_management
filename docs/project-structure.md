bakery-platform/
├── apps/
│   ├── web/                    # Next.js — Admin dashboard + customer tracking page
│   │   ├── app/
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── api/                    # NestJS — backend
│       ├── src/
│       │   ├── modules/
│       │   │   ├── production/
│       │   │   ├── finance/
│       │   │   ├── order/
│       │   │   └── marketing/
│       │   └── main.ts
│       ├── package.json
│       └── tsconfig.json
│
├── packages/
│   ├── database/                # Drizzle schema + migrations (SATU sumber kebenaran)
│   │   ├── schema.ts            # atau schema.ts kalau Drizzle
│   │   ├── migrations/
│   │   └── package.json
│   ├── shared-types/             # DTO/interface yang dipakai FE & BE (Order, Product, dll)
│   │   ├── src/
│   │   │   ├── order.types.ts
│   │   │   └── product.types.ts
│   │   └── package.json
│   ├── ui/                       # Komponen React reusable (kalau nanti ada landing page terpisah juga)
│   │   ├── src/
│   │   └── package.json
│   └── config/                   # eslint, tsconfig, prettier config bersama
│       ├── eslint-preset.js
│       └── tsconfig.base.json
│
├── package.json                  # root, workspaces config
├── turbo.json                    # task pipeline config
└── bun.lockb