# Cakeshop API

REST API (Hono + Bun) untuk Cakeshop Management Platform.

## Route overview

| Prefix | Modul | Auth |
| --- | --- | --- |
| `/api/health` | health check | publik |
| `/api/auth` | login, logout, me | publik + cookie |
| `/api/users` | user internal | admin |
| `/api/customers` | pelanggan | login |
| `/api/products`, `/api/product-categories` | katalog | login |
| `/api/recipes`, `/api/ingredients`, `/api/uoms`, `/api/tools`, `/api/labor-rates` | resep & bahan | login |
| `/api/production`, `/api/production-slots`, `/api/stock-transactions`, `/api/stock-alerts` | produksi & stok | login |
| `/api/orders` (+ sub-resource) | order & fulfillment | login |
| `/api/tracking/:token` | tracking publik | publik |
| `/api/payments`, `/api/financial-transactions`, `/api/product-costs`, `/api/pricing-rules`, `/api/product-prices`, `/api/sales-forecasts` | finance | admin |
| `/api/content`, `/api/value-propositions`, `/api/portfolio` | marketing | login |
| `/api/dashboard/summary` | dashboard | admin |

> Semua handler domain masih stub (`501 NOT_IMPLEMENTED`). Yang sudah berfungsi: auth (login/logout/me), health, validasi, rate limit, CSRF.
>
> Auth memakai sesi aktif di DB (tabel `session`, migrasi `0002`): login menyimpan hash token, logout mencabut sesi di server, dan JWT memuat `jti` unik per sesi. Lihat `docs/test-plan.md` untuk detail.

Lihat `docs/api-routes.md` untuk daftar endpoint lengkap.

## Development

```bash
bun install
bun run dev         # hot reload di http://localhost:4000
bun run seed        # buat admin + UOM default
bun run test        # test suite SRS (lihat docs/test-plan.md)
bun run typecheck
```

Konfigurasi: salin `.env.example` ke `.env`. Database: lihat `packages/database`.
