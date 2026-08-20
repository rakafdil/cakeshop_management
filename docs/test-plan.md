# Test Plan — traceability ke SRS

Suite test berbasis **`docs/srs.md`** yang dipisahkan secara modular untuk pemeliharaan yang lebih baik. Berada di `apps/api/src/tests/`, dijalankan dengan Bun test runner terhadap instance Hono app (tanpa server HTTP terpisah).

> Status saat ini: bisnis logic **belum** diimplementasikan (seluruh handler domain `501 NOT_IMPLEMENTED`). Test menguji **kontrak yang sudah jadi** (routing, auth/session, RBAC, CSRF, rate limit, validasi, error envelope) dan mencatat acceptance criteria (AC) tiap FR sebagai `test.todo` — untuk diaktifkan saat logic diimplementasikan.

## Struktur File Test

```
apps/api/src/tests/
├── helpers.ts               # Shared utilities (DB probe, auth, headers, fixture setup/cleanup)
├── infrastructure.test.ts   # Infrastruktur & validasi dasar (Health, CORS, CSRF, Rate Limit, Validation, Routing Map)
├── nfr-security.test.ts     # Non-functional: Autentikasi (NFR-SEC-04), RBAC (NFR-SEC-01), CSRF ter-authentikasi
├── module-a-pim.test.ts     # Modul A — Production & Inventory Management (FR-PIM-01 s/d FR-PIM-08)
├── module-b-fba.test.ts     # Modul B — Financial & Business Analytics (FR-FBA-01 s/d FR-FBA-08)
├── module-c-ocs.test.ts     # Modul C — Order Management & Customer Screening (FR-OCS-01 s/d FR-OCS-10)
└── module-d-mvc.test.ts     # Modul D — Marketing & Value Communication (FR-MVC-01 s/d FR-MVC-05)
```

## Cara menjalankan

```bash
docker compose up -d db        # PostgreSQL
bun run db:migrate             # aplikasikan migrasi (dijalankan otomatis oleh turbo sebelum `test`)
bun run test                   # = turbo run test -> bun test di apps/api
```

Tanpa DB yang terjangkau, seluruh test bertanda `Dengan DB (PostgreSQL)` di-skip otomatis (TCP probe ke `DATABASE_URL`); test infrastruktur tetap berjalan.

---

## 1. Infrastruktur (tanpa DB) — `infrastructure.test.ts`

| Area | Verifikasi |
| --- | --- |
| Health & envelope | `GET /api/health` 200; route tak dikenal 404; semua error berbentuk `{ error: { code, message } }` |
| CORS | preflight OPTIONS → `Access-Control-Allow-Origin` + `Allow-Credentials: true` + `Allow-Headers` berisi `x-csrf-token`; origin tak dikenal ditolak |
| CSRF | POST tanpa token → 403 `CSRF_FAILED`; token cocok → lolos; GET tidak wajib token |
| Rate limit | > `RATE_LIMIT_MAX` request per IP → 429 `RATE_LIMITED` |
| Validasi | tracking token pendek → 400 `VALIDATION_ERROR`; login email tak valid → 400 |
| Routing map | seluruh resource terproteksi tanpa login → 401 `UNAUTHORIZED` |
| NFR-SEC-02 | default `tracking_token` = `gen_random_bytes(24)` (192 bit ≥ 128 bit) |

---

## 2. Keamanan & NFR (dengan DB) — `nfr-security.test.ts`

| ID | Verifikasi | Status |
| --- | --- | --- |
| NFR-SEC-04 | login benar/salah, cookie `httpOnly` + `SameSite=Lax`, `GET /me`, **logout mencabut sesi di server** → token lama ditolak 401 | ✅ diuji |
| NFR-SEC-01 | staff → 403 `FORBIDDEN` di `/api/users`, `/api/financial-transactions`, `/api/dashboard/summary`; admin & staff di modul yang diizinkan | ✅ diuji |
| NFR-SEC-04 | session timeout 30 menit karena inaktivitas | ⏳ todo (dasar: `session.last_activity_at`) |
| NFR-SEC-03 | enkripsi data PII at-rest (AES-256) & TLS 1.2+ | ⏳ luar cakupan unit test (infra/ops) |

---

## 3. Modul A — Production & Inventory (`module-a-pim.test.ts`)

Berdasarkan **FR-PIM-01 s/d FR-PIM-08**:
- **test kontrak**: endpoint terkait ter-registrasi & mengembalikan `501 NOT_IMPLEMENTED` (termasuk verifikasi RBAC di sana).
- **`test.todo`**: AC dari SRS (riwayat harga menyimpan nilai lama, recalculasi otomatis, repository resep, visibilitas resep staff tanpa harga, batch-size enforcement, pengurangan stok, alert ≤ 5 menit, konversi satuan).

---

## 4. Modul B — Financial & Analytics (`module-b-fba.test.ts`)

Berdasarkan **FR-FBA-01 s/d FR-FBA-08**:
Kontrak diuji di: `/api/financial-transactions`, `/api/product-costs`, `/api/pricing-rules`, `/api/product-prices`, `/api/sales-forecasts`, `/api/orders`, `/api/products`.

- ⚠️ **FR-FBA-08 (ekspor PDF/Excel)**: belum ada endpoint ekspor → hanya `todo`. Perlu rute baru saat logic diimplementasikan.
- ⚠️ **FR-FBA-03 (laporan laba/rugi)**: tidak ada endpoint laporan khusus → kontrak diuji lewat sumber data (`financial-transactions`), AC sebagai `todo`.

---

## 5. Modul C — Order & Customer Screening (`module-c-ocs.test.ts`)

Berdasarkan **FR-OCS-01 s/d FR-OCS-10**:
Kontrak diuji di: `/api/orders` (+ `items`, `status-history`, `reviews`, `reminders`, `payments`, `production-slots`), `/api/customers`, `/api/tracking/:token`.

- ⚠️ **FR-OCS-04 (notifikasi otomatis)**: tidak ada endpoint dispatch terpisah → kontrak lewat `orders/:id/reminders`; delivery log & retry (NFR-REL-03) sebagai `todo`.

---

## 6. Modul D — Marketing & Value Communication (`module-d-mvc.test.ts`)

Berdasarkan **FR-MVC-01 s/d FR-MVC-05**:
Kontrak diuji di: `/api/content`, `/api/value-propositions`, `/api/portfolio`, `/api/products`.

---

## Catatan penting (temuan saat membangun test)

1. **Envelope error validasi**: `@hono/zod-validator` mengembalikan body bawaan yang berbeda format. Diperbaiki di kode — `lib/validators.ts` kini memakai hook kustom sehingga semua 400 berformat `{ error: { code: 'VALIDATION_ERROR', ... } }` (konsisten dengan `lib/validate.ts`).
2. **Logout harus mencabut sesi di server**: JWT stateless tidak bisa dibatalkan hanya dengan menghapus cookie. Ditambahkan tabel `session` (migrasi `0002`):
   - login menyimpan `sha256(token)` + `expires_at`; `authenticate` memvalidasi token via sesi aktif (`revoked_at IS NULL`).
   - logout menandai `revoked_at`.
   - `jti` acak ditambahkan ke payload JWT agar tiap sesi punya token unik (sebelumnya dua login dalam detik yang sama menghasilkan token identik → melanggar unique constraint).
3. **Rate limit login**: tiap test memakai IP unik (`x-forwarded-for`) agar tidak saling kena batas `AUTH_RATE_LIMIT_MAX`.
4. **Isolasi test per file**: helper `setupTestUsers` menghasilkan kredensial dengan suffix acak unik per test suite sehingga setiap file test dapat berjalan secara independen dan paralel.