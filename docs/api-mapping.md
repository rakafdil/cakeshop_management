# API-to-Database Mapping

Dokumen ini adalah referensi pemetaan field API ke sumber data PostgreSQL.
Sumber kebenaran database adalah schema Drizzle di
`packages/database/src/schema` dan SQL referensi `Cakeshop Management.sql`.
Nama field API menggunakan `camelCase`, sedangkan nama kolom database
menggunakan `snake_case`.

> **Status implementasi:** banyak endpoint domain masih berupa `501
> NOT_IMPLEMENTED`. Mapping di bawah tetap mendokumentasikan kontrak yang
> direncanakan/tersedia sehingga implementasi berikutnya memakai nama field dan
> relasi yang konsisten.

## Daftar isi

1. [Konvensi](#1-konvensi)
2. [Bentuk respons umum](#2-bentuk-respons-umum)
3. [Kontrak CRUD reusable](#3-kontrak-crud-reusable)
4. [Auth](#4-auth)
5. [Catalog](#5-catalog)
6. [Production dan inventory](#6-production-dan-inventory)
7. [Orders dan customers](#7-orders-dan-customers)
8. [Public tracking](#8-public-tracking)
9. [Finance dan pricing](#9-finance-dan-pricing)
10. [Marketing](#10-marketing)
11. [Users dan dashboard](#11-users-dan-dashboard)
12. [Health dan OpenAPI](#12-health-dan-openapi)
13. [Tabel database tanpa CRUD endpoint langsung](#13-tabel-database-tanpa-crud-endpoint-langsung)
14. [Catatan implementasi](#14-catatan-implementasi)

## Ringkasan status implementasi

| Area | Status |
| --- | --- |
| Endpoint yang memakai `crud(label, middleware)` | Hanya route/auth contract; mengembalikan `501 NOT_IMPLEMENTED`. |
| `/api/uoms` | Diimplementasikan lewat `autoCrud` (`SELECT/INSERT/UPDATE/DELETE` nyata). |
| `POST /api/products` | `autoCrud` product belum memasang `createSchema`; lihat [5.1](#51-product). |
| `POST /api/auth/change-password` | Belum ada mapping input; mengembalikan `501`. |
| `GET /api/orders/:id/status-history` | Sudah memakai service query. |
| `GET/POST /api/orders/:id/payments` | `POST` dan summary `GET` sudah memakai service. |
| `/api/orders/:id/items`, `/reviews`, `/reminders`, `/production-slots` | Route saat ini stub. |
| `GET /api/tracking/:token` | Stub. |
| `GET /api/dashboard/summary` | Mengembalikan `501`. |
| Child relation recipe, attach value proposition, laporan laba/rugi, price recommendation | Belum memiliki route di `app.ts`. |

## 1. Konvensi

### Istilah

| Istilah | Arti |
| --- | --- |
| Direct mapping | Field API berasal langsung dari satu kolom tabel. |
| Foreign key | Field API berisi ID relasi; nilainya berasal dari kolom FK. |
| JOIN | Field API berasal dari tabel terkait melalui FK atau tabel junction. |
| One-to-many | Array API berasal dari banyak baris tabel anak. |
| Derived | Nilai dihitung dari satu atau beberapa kolom, bukan disimpan langsung. |
| Server-managed | Dibuat/diisi server atau database; bukan input client biasa. |
| Not exposed | Kolom ada di database tetapi tidak boleh dikembalikan pada DTO tertentu. |

### Aturan lintas resource

1. **Server-managed.** Field `id`, timestamps, order number, tracking token,
   status awal, subtotal/total, dan generated column harus diabaikan dari input
   client (atau ditolak dengan `VALIDATION_ERROR`) dan dihitung ulang di
   backend.
2. **Foreign key.** FK tidak boleh dipetakan sebagai kolom fiktif pada tabel
   lain. Contoh: `categoryId` produk selalu melalui `product_category_map`.
3. **Decimal.** Decimal PostgreSQL (uang, quantity) diserialisasi sebagai
   **string** untuk menjaga presisi. Number hanya dipakai pada DTO yang memang
   menghitung (contoh: `summary` payment) dan pengecualian itu harus
   didokumentasikan pada DTO tersebut.
4. **Operasi tulis.** `POST`, `PUT`, `PATCH`, dan `DELETE` wajib menyertakan
   header `X-CSRF-Token`.
5. **Pagination.** Query memakai `pageSize`, sedangkan response memakai
   `pagination.limit`.

## 2. Bentuk respons umum

### Response item

| API field | Database source | Keterangan |
| --- | --- | --- |
| `data` | Satu row/resource | Wrapper untuk detail, create, dan update. |

### Response list

| API field | Database source | Keterangan |
| --- | --- | --- |
| `data[]` | Banyak row/resource | Hasil `SELECT` dengan pagination. |
| `pagination.page` | Query `page` | Derived dari query parameter, default `1`. |
| `pagination.limit` | Query `pageSize` | Derived dari query parameter, default `20`. |
| `pagination.total` | `COUNT(*)` pada tabel resource | Derived; `autoCrud` memakai nama `limit`, bukan `pageSize`. |

### Error

Semua error memakai envelope `{ "error": { "code", "message", "details" } }`.

| API field | Database source | Keterangan |
| --- | --- | --- |
| `error.code` | Tidak ada | Kode aplikasi, misalnya `VALIDATION_ERROR`, `UNAUTHORIZED`, atau `NOT_FOUND`. |
| `error.message` | Tidak ada | Pesan aplikasi. |
| `error.details` | Tidak ada | Detail validasi opsional. |

## 3. Kontrak CRUD reusable

Kontrak ini berlaku untuk resource berikut. Endpoint yang memakai `crud()`
masih mengembalikan `501 NOT_IMPLEMENTED`, tetapi request dan response di bawah
adalah kontrak target yang harus dipertahankan ketika logic domain diaktifkan.

| Resource | Tabel | Auth |
| --- | --- | --- |
| `/api/users` | `user` | Admin |
| `/api/customers` | `customer` | Admin/staff |
| `/api/product-categories` | `product_category` | Admin/staff |
| `/api/recipes` | `recipe` | Admin/staff |
| `/api/ingredients` | `ingredient` | Admin/staff |
| `/api/tools` | `tool` | Admin/staff |
| `/api/labor-rates` | `labor_rate` | Admin/staff |
| `/api/production` | `production` | Admin/staff |
| `/api/production-slots` | `production_slot` | Admin/staff |
| `/api/stock-transactions` | `stock_transaction` | Admin/staff, read-only |
| `/api/stock-alerts` | `stock_alert` | Admin/staff |
| `/api/payments` | `payment` | Admin |
| `/api/financial-transactions` | `financial_transaction` | Admin |
| `/api/product-costs` | `product_cost` | Admin |
| `/api/pricing-rules` | `pricing_rule` | Admin |
| `/api/product-prices` | `product_price` | Admin |
| `/api/sales-forecasts` | `sales_forecast` | Admin |
| `/api/content` | `content` | Admin/staff |
| `/api/value-propositions` | `value_proposition_template` | Admin/staff |
| `/api/portfolio` | `portfolio` | Admin/staff |

Pengecualian dan tambahan:

- `/api/stock-transactions` read-only: hanya `GET` list dan detail.
- `/api/stock-alerts` memiliki endpoint tambahan `PATCH /:id/resolve`.
- `/api/uoms` memakai kontrak yang sama dan sudah diimplementasikan lewat
  `autoCrud`.

### `GET /api/{resource}`

| Query | Tipe | Keterangan |
| --- | --- | --- |
| `page` | integer | Default `1`, minimum `1`. |
| `pageSize` | integer | Default `20`, maksimum `100`; response memakai nama `limit`. |
| `q` | string | Pencarian opsional; field pencarian ditentukan per resource. |

Response `200`:

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 0
  }
}
```

`data[]` berisi field response tabel resource sesuai mapping pada bagian
domain. `total` berasal dari `COUNT(*)`.

### `GET /api/{resource}/:id`

`id` adalah UUID dan dipetakan ke primary key tabel resource.

Response `200`:

```json
{
  "data": {}
}
```

### `POST /api/{resource}`

Header wajib: `Content-Type: application/json` dan `X-CSRF-Token`.

Body hanya boleh berisi kolom writable. `id`, timestamps, generated column,
dan field audit server harus diabaikan dari body atau ditolak dengan
`VALIDATION_ERROR`.

Response `201`:

```json
{
  "data": {}
}
```

### `PATCH /api/{resource}/:id`

Header wajib: `Content-Type: application/json` dan `X-CSRF-Token`.
Body adalah subset field writable (partial update).

Response `200`:

```json
{
  "data": {}
}
```

### `DELETE /api/{resource}/:id`

Header wajib: `X-CSRF-Token`.

Response `204 No Content` tanpa body. Jika row tidak ditemukan, response
`404 NOT_FOUND`.

### Error umum CRUD

| HTTP | Code | Kondisi |
| --- | --- | --- |
| `400` | `VALIDATION_ERROR` | UUID, enum, body, atau nilai constraint tidak valid. |
| `401` | `UNAUTHORIZED` | Belum login/session tidak valid. |
| `403` | `FORBIDDEN` | Role tidak memiliki akses. |
| `403` | `CSRF_FAILED` | Header CSRF tidak cocok untuk operasi tulis. |
| `404` | `NOT_FOUND` | Resource atau ID tidak ditemukan. |
| `409` | `CONFLICT` | Unique/FK/check constraint menyebabkan konflik. |
| `501` | `NOT_IMPLEMENTED` | Handler domain belum diaktifkan. |

## 4. Auth

### Endpoint

| Endpoint | Request | Response sukses | Sumber/efek database |
| --- | --- | --- | --- |
| `POST /api/auth/login` | `{ email, password }` | `200 { user, csrfToken }` + cookies | Baca `user`; insert `session`. |
| `POST /api/auth/logout` | Tidak ada body | `200 { ok: true }` | Set `session.revoked_at` berdasarkan token terautentikasi. |
| `GET /api/auth/me` | Tidak ada body | `200 { user }` | Baca `session` JOIN `user`; shape sama dengan `LoginResponse.user`. |
| `POST /api/auth/change-password` | Belum ditetapkan; rekomendasi `{ currentPassword, newPassword }` | Target `200 { ok: true }` | Update `user.password_hash`; saat ini `501`. |

Error login: `400 VALIDATION_ERROR` untuk payload invalid dan
`401 INVALID_CREDENTIALS` untuk kredensial salah. Error auth umum juga dapat
berupa `401 UNAUTHORIZED`.

### `LoginRequest`

| API field | Database source | Keterangan |
| --- | --- | --- |
| `email` | `user.email` | Dipakai untuk mencari user. |
| `password` | `user.password_hash` | Input tidak disimpan; diverifikasi terhadap hash Argon2id. |

### `LoginResponse`

| API field | Database source | Keterangan |
| --- | --- | --- |
| `user.id` | `user.id` | Direct mapping. |
| `user.name` | `user.name` | Direct mapping. |
| `user.email` | `user.email` | Direct mapping. |
| `user.role` | `user.role` | Enum `admin`/`staff`. |
| `user.isActive` | `user.is_active` | Direct mapping. |
| `user.createdAt` | `user.created_at` | Serialisasi ISO datetime. |
| `csrfToken` | Tidak ada | Token aplikasi pada cookie/response; bukan kolom database. |

### Sesi server

Saat login berhasil, sesi server disimpan sebagai berikut:

| Sesi API/server | Database source | Keterangan |
| --- | --- | --- |
| authenticated user | `session.user_id` → `user.id` | Foreign key. |
| auth token | `session.token_hash` | Hanya hash token disimpan, bukan token mentah. |
| expiry | `session.expires_at` | Server-managed. |
| last activity | `session.last_activity_at` | Dasar idle timeout. |
| revocation | `session.revoked_at` | Diisi saat logout; `NULL` berarti belum dicabut. |
| created time | `session.created_at` | Server-managed. |

### `change-password` (rekomendasi)

| Field | Tipe | Database source | Keterangan |
| --- | --- | --- | --- |
| `currentPassword` | string | `user.password_hash` | Verifikasi, tidak disimpan. |
| `newPassword` | string | `user.password_hash` | Hash Argon2id baru. |

## 5. Catalog

### 5.1 Product

#### Endpoint

| Endpoint | Body/query | Response | Database |
| --- | --- | --- | --- |
| `GET /api/products` | `page`, `pageSize`, `q` | Paginated `ProductSummary[]` | `product`; optional category JOIN. |
| `GET /api/products/:id` | Path UUID | `{ data: ProductDetail }` | `product` + category/recipe/value proposition/portfolio JOIN. |
| `POST /api/products` | `CreateProductRequest` | `201 { data: ProductDetail }` | Insert `product`, lalu `product_category_map`. |
| `PATCH /api/products/:id` | Partial product fields | `{ data: ProductDetail }` | Update `product`; replace category map hanya bila diminta. |
| `DELETE /api/products/:id` | Path UUID | `204` | Delete product dan cascade relasi sesuai FK. |
| `PUT /api/products/:id/categories` | `{ categoryIds: UUID[] }` | `{ data: ProductCategory[] }` | Transactional replace `product_category_map`. |
| `PUT /api/products/:id/value-propositions` | `{ templateIds: UUID[] }` | `{ data: ValueProposition[] }` | Replace `product_value_proposition`; belum ada route (lihat [10](#10-marketing)). |

`ProductSummary` memakai `id`, `name`, `description`, `productionType`,
`fulfillmentType`, `marketSegment`, `basePrice`, `isActive`, `createdAt`, dan
`updatedAt`. Kategori dan array relasi hanya ada pada detail.

#### `CreateProductRequest` — `POST /api/products`

| API field | Database source | Keterangan |
| --- | --- | --- |
| `name` | `product.name` | Direct mapping. |
| `description` | `product.description` | Direct mapping; nullable di database. |
| `categoryId` | `product_category_map.category_id` | Foreign key melalui junction; satu request dapat memasang kategori produk. |
| `productionType` | `product.production_type` | Direct mapping enum `batch`/`unit`. |
| `fulfillmentType` | `product.fulfillment_type` | Direct mapping enum `pre_order`/`ready_stock`/`hybrid`. |
| `marketSegment` | `product.market_segment` | Direct mapping enum `premium_artisan`/`everyday_budget`. |
| `basePrice` | `product.base_price` | Direct mapping decimal; dikelola server pada endpoint product generik. |
| `isActive` | `product.is_active` | Direct mapping; default `true`. |

Field server-managed pada response:

| API field | Database source | Keterangan |
| --- | --- | --- |
| `id` | `product.id` | Server-managed UUID. |
| `createdAt` | `product.created_at` | Server-managed timestamp. |
| `updatedAt` | `product.updated_at` | Server-managed timestamp. |

> **Catatan:** `createProductSchema` memvalidasi `categoryId`, tetapi
> `autoCrud` product saat ini belum memasang `createSchema`. Implementasi create
> produk harus menyimpan row `product` lalu row `product_category_map`, bukan
> menulis `category_id` ke tabel `product`.

#### `ProductDetailResponse` — `GET /api/products/:id`

| API field | Database source | Keterangan |
| --- | --- | --- |
| `id`, `name`, `description` | `product.id`, `product.name`, `product.description` | Direct mapping. |
| `productionType`, `fulfillmentType`, `marketSegment` | Kolom enum pada `product` | Direct mapping. |
| `basePrice`, `isActive`, `createdAt`, `updatedAt` | Kolom terkait pada `product` | Direct mapping/server-managed. |
| `category.id`, `category.name`, `category.description` | `product_category.*` | JOIN melalui `product_category_map.product_id` dan `.category_id`. |
| `categories[]` | `product_category_map` + `product_category` | Many-to-many; gunakan bila produk dapat memiliki lebih dari satu kategori. |
| `recipes[]` | `recipe.*` | One-to-many melalui `recipe.product_id`. |
| `recipes[].ingredients[]` | `recipe_ingredient.*` | One-to-many melalui `recipe_ingredient.recipe_id`. |
| `recipes[].ingredients[].ingredient` | `ingredient.*` | JOIN melalui `recipe_ingredient.ingredient_id`. |
| `recipes[].ingredients[].uom` | `uom.*` | JOIN melalui `recipe_ingredient.uom_id`. |
| `recipes[].tools[]` | `recipe_tool.*` | One-to-many melalui `recipe_tool.recipe_id`. |
| `recipes[].tools[].tool` | `tool.*` | JOIN melalui `recipe_tool.tool_id`. |
| `recipes[].images[]` | `recipe_image.*` | One-to-many melalui `recipe_image.recipe_id`. |
| `valuePropositions[]` | `product_value_proposition` + `value_proposition_template` | Many-to-many melalui `product_id`/`template_id`. |
| `portfolio[]` | `portfolio.*` | One-to-many melalui `portfolio.product_id`. |

### 5.2 Product category

Resource: `GET/POST/PATCH/DELETE /api/product-categories[/:id]` (CRUD reusable;
body `{ name, description? }`).

| API field | Database source | Keterangan |
| --- | --- | --- |
| `id` | `product_category.id` | Server-managed UUID. |
| `name` | `product_category.name` | Direct mapping. |
| `description` | `product_category.description` | Direct mapping, nullable. |

`PUT /api/products/:id/categories` menerima daftar kategori; hasilnya mengganti
rows pada `product_category_map`.

### 5.3 Recipe

Resource: `GET/POST/PATCH/DELETE /api/recipes[/:id]` (CRUD reusable). Detail
menyertakan child recipe.

| API field | Database source | Keterangan |
| --- | --- | --- |
| `id` | `recipe.id` | Direct/server-managed. |
| `productId` | `recipe.product_id` | Foreign key ke `product.id`. |
| `version` | `recipe.version` | Direct mapping; unik per product. |
| `preparationSteps` | `recipe.preparation_steps` | Direct mapping. |
| `difficultyLevel` | `recipe.difficulty_level` | Direct mapping, 1–5. |
| `estimatedLaborMinutes` | `recipe.estimated_labor_minutes` | Direct mapping decimal. |
| `isComplete` | `recipe.is_complete` | Direct mapping. |
| `createdAt`, `updatedAt` | `recipe.created_at`, `recipe.updated_at` | Server-managed. |

Body writable: `{ productId, version, preparationSteps, difficultyLevel,
estimatedLaborMinutes, isComplete }`.

#### Recipe child relations

Target contract untuk detail recipe. Relasi ini belum memiliki route di
`app.ts`; tabel dan kontrak disiapkan untuk implementasi berikutnya.

| Endpoint | Body | Response | Database |
| --- | --- | --- | --- |
| `GET /api/recipes/:id/ingredients` | None | `{ data: RecipeIngredient[] }` | `recipe_ingredient` JOIN `ingredient`, `uom`. |
| `POST /api/recipes/:id/ingredients` | `{ ingredientId, quantity, uomId, notes? }` | `201 { data: RecipeIngredient }` | Insert `recipe_ingredient`. |
| `GET /api/recipes/:id/tools` | None | `{ data: RecipeTool[] }` | `recipe_tool` JOIN `tool`. |
| `POST /api/recipes/:id/tools` | `{ toolId, quantity? }` | `201 { data: RecipeTool }` | Insert `recipe_tool`. |
| `GET /api/recipes/:id/images` | None | `{ data: RecipeImage[] }` | `recipe_image`. |
| `POST /api/recipes/:id/images` | `{ imageUrl, caption? }` | `201 { data: RecipeImage }` | Insert `recipe_image`. |

### 5.4 Ingredient

Resource: `GET/POST/PATCH/DELETE /api/ingredients[/:id]` (CRUD reusable).

| API field | Database source | Keterangan |
| --- | --- | --- |
| `id`, `name` | `ingredient.id`, `ingredient.name` | Direct mapping. |
| `purchaseUomId` | `ingredient.purchase_uom_id` | Foreign key ke `uom.id`. |
| `currentStock` | `ingredient.current_stock` | Direct mapping decimal. |
| `minimumStock` | `ingredient.minimum_stock` | Direct mapping threshold. |
| `isActive` | `ingredient.is_active` | Direct mapping. |

Body writable: `{ name, purchaseUomId, currentStock?, minimumStock?, isActive? }`.

#### Ingredient price history

Resource: `/api/ingredients/:id/price-history`.

| Endpoint | Request | Response | Database |
| --- | --- | --- | --- |
| `GET /api/ingredients/:id/price-history` | Pagination query | `{ data: IngredientPriceHistory[], pagination }` | `ingredient_price_history`. |
| `POST /api/ingredients/:id/price-history` | `{ price }` | `201 { data: IngredientPriceHistory }` | Insert history dengan `previousPrice`; update/recalculate cost terkait. |

| API field | Database source | Keterangan |
| --- | --- | --- |
| `id` | `ingredient_price_history.id` | Server-managed UUID. |
| `ingredientId` | `ingredient_price_history.ingredient_id` | Foreign key dari path `:id`. |
| `price` | `ingredient_price_history.price` | Direct mapping. |
| `previousPrice` | `ingredient_price_history.previous_price` | Direct mapping, nullable. |
| `changedAt` | `ingredient_price_history.changed_at` | Server-managed timestamp. |

### 5.5 UOM dan konversi

Resource: `GET/POST/PATCH/DELETE /api/uoms[/:id]` (diimplementasikan lewat
`autoCrud`). Body `{ name, symbol, type }`; `PATCH` partial.

| API field | Database source | Keterangan |
| --- | --- | --- |
| `uom.id`, `name`, `symbol`, `type` | `uom.id`, `uom.name`, `uom.symbol`, `uom.type` | Direct mapping. |
| `uomConversion.fromUomId` | `uom_conversion.from_uom_id` | Foreign key ke `uom.id`. |
| `uomConversion.toUomId` | `uom_conversion.to_uom_id` | Foreign key ke `uom.id`. |
| `uomConversion.conversionFactor` | `uom_conversion.conversion_factor` | Direct mapping. |

### 5.6 Tool

Resource: `GET/POST/PATCH/DELETE /api/tools[/:id]` (CRUD reusable). Body
`{ name, purchaseCost, usefulLife }`.

| API field | Database source | Keterangan |
| --- | --- | --- |
| `id`, `name` | `tool.id`, `tool.name` | Direct mapping. |
| `purchaseCost` | `tool.purchase_cost` | Direct mapping. |
| `usefulLife` | `tool.useful_life` | Direct mapping. |
| `costPerUse` | `tool.cost_per_use` | Generated database column (`purchase_cost / useful_life`); read-only. |

### 5.7 Labor rate

Resource: `GET/POST/PATCH/DELETE /api/labor-rates[/:id]` (CRUD reusable). Body
`{ ratePerHour, effectiveDate }`.

| API field | Database source | Keterangan |
| --- | --- | --- |
| `id`, `ratePerHour` | `labor_rate.id`, `labor_rate.rate_per_hour` | Direct mapping. |
| `effectiveDate` | `labor_rate.effective_date` | Direct mapping tanggal. |
| `createdAt` | `labor_rate.created_at` | Server-managed. |

## 6. Production dan inventory

### 6.1 Production

#### Endpoint

| Endpoint | Request | Response | Database |
| --- | --- | --- | --- |
| `GET /api/production` | Pagination + optional product/status/date filter | Paginated `Production[]` | `production` + optional product/recipe JOIN. |
| `POST /api/production` | `{ productId, recipeId, quantity, productionDate, status? }` | `201 { data: Production }` | Insert `production`; status default `planned`. |
| `GET/PATCH/DELETE /api/production/:id` | Partial production fields | `{ data: Production }` / `204` | Read/update/delete `production`. |
| `GET /api/production/:id/stock-transactions` | Pagination | `{ data: StockTransaction[], pagination }` | `stock_transaction.production_id = :id`. |

`GET /api/production/:id/stock-transactions` memfilter berdasarkan
`production_id`; array hasilnya bukan kolom pada `production`.

#### Field mapping

| API field | Database source | Keterangan |
| --- | --- | --- |
| `production.id` | `production.id` | Direct/server-managed. |
| `production.productId` | `production.product_id` | Foreign key ke `product.id`. |
| `production.recipeId` | `production.recipe_id` | Foreign key ke `recipe.id`. |
| `production.quantity` | `production.quantity` | Direct mapping decimal. |
| `production.status` | `production.status` | Enum `planned`, `in_progress`, `completed`, `cancelled`. |
| `production.productionDate` | `production.production_date` | Direct mapping tanggal. |
| `production.createdAt` | `production.created_at` | Server-managed. |
| `production.product` | `product.*` | JOIN melalui `production.product_id`. |
| `production.recipe` | `recipe.*` | JOIN melalui `production.recipe_id`. |

> Status produksi `in_progress` adalah status batch produksi dan berbeda dari
> status order `in_production`. Konsumsi ingredient untuk order hanya dipicu
> oleh `PATCH /api/orders/:id/status` dengan target `in_production`
> (lihat [7.4](#74-patch-apiordersidstatus-dan-konsumsi-stok)).

### 6.2 Production slot

| Endpoint | Request | Response | Database |
| --- | --- | --- | --- |
| `GET /api/production-slots` | Pagination + date/availability filter | Paginated `ProductionSlot[]` | `production_slot`. |
| `POST /api/production-slots` | `{ slotDate, startTime, endTime, capacity }` | `201 { data: ProductionSlot }` | Insert `production_slot`. |
| `PATCH/DELETE /api/production-slots/:id` | Partial slot fields / none | `{ data: ProductionSlot }` / `204` | Update/delete slot. |

| API field | Database source | Keterangan |
| --- | --- | --- |
| `productionSlot.id` | `production_slot.id` | Direct/server-managed. |
| `productionSlot.slotDate` | `production_slot.slot_date` | Direct mapping. |
| `productionSlot.startTime`, `endTime` | `production_slot.start_time`, `production_slot.end_time` | Direct mapping. |
| `productionSlot.capacity` | `production_slot.capacity` | Direct mapping. |
| `productionSlot.reservedCapacity` | `production_slot.reserved_capacity` | Direct mapping. |
| `productionSlot.isAvailable` | `production_slot.is_available` | Direct mapping. |

### 6.3 Stock transaction

#### `GET /api/stock-transactions`

Endpoint authenticated, **read-only** untuk client. Koreksi stok harus memakai
endpoint adjustment khusus admin agar tidak mengubah audit transaksi historis.
Saat implementasi CRUD selesai, dukung filter berikut:

| Query parameter | Tipe | Keterangan |
| --- | --- | --- |
| `page` | integer | Default `1`. |
| `pageSize` | integer | Default `20`, maksimum `100`. |
| `ingredientId` | UUID | Filter ingredient tertentu. |
| `orderId` | UUID | Menampilkan konsumsi untuk order tertentu. |
| `productionId` | UUID | Filter produksi tertentu. |
| `transactionType` | enum | `in`, `out`, `adjustment`, `waste`. |
| `from` / `to` | ISO date | Filter rentang `created_at`. |

#### Field mapping

| API field | Database source | Keterangan |
| --- | --- | --- |
| `id` | `stock_transaction.id` | Direct/server-managed. |
| `ingredientId` | `stock_transaction.ingredient_id` | Foreign key ke `ingredient.id`. |
| `transactionType` | `stock_transaction.transaction_type` | Enum `in`/`out`/`adjustment`/`waste`. |
| `quantity` | `stock_transaction.quantity` | Direct mapping. |
| `stockBefore`, `stockAfter` | `stock_transaction.stock_before`, `.stock_after` | Direct mapping audit stok. |
| `productionId` | `stock_transaction.production_id` | Nullable foreign key ke `production.id`. |
| `orderId` | `stock_transaction.order_id` | Nullable foreign key ke `customer_order.id`. |
| `createdAt` | `stock_transaction.created_at` | Server-managed. |

Contoh response item:

```json
{
  "id": "transaction-uuid",
  "ingredientId": "ingredient-uuid",
  "transactionType": "out",
  "quantity": "0.250",
  "stockBefore": "2.000",
  "stockAfter": "1.750",
  "productionId": null,
  "orderId": "order-uuid",
  "createdAt": "2026-11-05T06:10:00.000Z"
}
```

### 6.4 Stock alert

#### Endpoint

| Endpoint | Request | Response | Database |
| --- | --- | --- | --- |
| `GET /api/stock-alerts` | Pagination + `isResolved`, `ingredientId` | Paginated `StockAlert[]` | `stock_alert`. |
| `PATCH /api/stock-alerts/:id/resolve` | `{ isResolved: true }` | `{ data: StockAlert }` | Update `stock_alert.is_resolved`. |

Resolve hanya menutup alert. Endpoint ini tidak menambah stok dan tidak
menghapus `stock_transaction`.

#### Field mapping

| API field | Database source | Keterangan |
| --- | --- | --- |
| `id` | `stock_alert.id` | Direct mapping. |
| `ingredientId` | `stock_alert.ingredient_id` | Foreign key ke `ingredient.id`. |
| `stockLevel` | `stock_alert.stock_level` | Stok setelah konsumsi. |
| `threshold` | `stock_alert.threshold` | Snapshot threshold ketika alert dibuat. |
| `isResolved` | `stock_alert.is_resolved` | Direct mapping; diubah oleh `PATCH .../resolve`. |
| `createdAt` | `stock_alert.created_at` | Server-managed. |

Contoh response resolve (`200 OK`):

```json
{
  "data": {
    "id": "alert-uuid",
    "ingredientId": "ingredient-uuid",
    "stockLevel": "1.750",
    "threshold": "2.000",
    "isResolved": true,
    "createdAt": "2026-11-05T06:10:00.000Z"
  }
}
```

## 7. Orders dan customers

### 7.1 Endpoint order

#### Core order

| Endpoint | Request | Response | Database |
| --- | --- | --- | --- |
| `POST /api/orders` | `CreateOrderWithCustomerRequest` | `201 { data: OrderDetail }` | Transaction: customer + order + items + initial history/review. |
| `GET /api/orders` | `page`, `pageSize`, `status`, `sourceChannel`, `customerId` | `{ data: OrderSummary[], pagination }` | `customer_order` LEFT JOIN `customer`. |
| `GET /api/orders/:id` | Path UUID | `{ data: OrderDetail }` | Order + customer + items/product/UOM. |
| `PATCH /api/orders/:id/status` | `{ status: OrderStatus }` | `{ data: CustomerOrder }` | Update order + history; konsumsi stok hanya pada `in_production` ([7.4](#74-patch-apiordersidstatus-dan-konsumsi-stok)). |

`OrderStatus` adalah `received`, `confirmed`, `requires_review`,
`in_production`, `ready`, `out_for_delivery`, `completed`,
`cancelled_no_response`, atau `cancelled_other`.

#### Sub-resources

| Endpoint | Request | Response | Database | Status |
| --- | --- | --- | --- | --- |
| `GET /api/orders/:id/items` | Pagination | `{ data: OrderItem[], pagination }` | `order_item` JOIN product/UOM. | Stub |
| `POST /api/orders/:id/items` | `CreateOrderItemRequest` | `201 { data: OrderItem }` | Insert `order_item`; recalculate order totals. | Stub |
| `GET /api/orders/:id/status-history` | None | `{ data: OrderStatusHistory[] }` | `order_status_history` LEFT JOIN `user`. | Service query |
| `GET /api/orders/:id/reviews` | None | `{ data: OrderReview[] }` | `order_review`. | Stub |
| `POST /api/orders/:id/reviews` | `{ reason, status?, notes? }` | `201 { data: OrderReview }` | Insert/update screening review. | Stub |
| `GET /api/orders/:id/reminders` | None | `{ data: OrderReminder[] }` | `order_reminder`. | Stub |
| `POST /api/orders/:id/reminders` | `{ reminderNumber, channel, scheduledAt }` | `201 { data: OrderReminder }` | Insert scheduled reminder. | Stub |
| `GET /api/orders/:id/payments` | None | `{ data: Payment[], summary }` | `payment`; summary adalah aggregate. | Service |
| `POST /api/orders/:id/payments` | `{ amount, paymentMethod, proofUrl?, status? }` | `201 { data: Payment }` | Insert payment; `paidAt` diisi jika verified. | Service |
| `GET /api/orders/:id/production-slots` | None | `{ data: ProductionSlot[] }` | Junction `order_production_slot` JOIN slot. | Stub |
| `PUT /api/orders/:id/production-slots` | `{ productionSlotIds: UUID[] }` | `{ data: ProductionSlot[] }` | Transactional replace junction rows dan capacity. | Stub |

`POST /api/orders/:id/items` wajib menolak perubahan setelah order
`in_production`, karena resep dan konsumsi stok sudah diproses. Jika
perubahan item diperlukan, buat order adjustment/reversal contract terpisah;
jangan mengubah audit lama.

### 7.2 Create order

#### `CreateOrderWithCustomerRequest` — `POST /api/orders`

Customer (existing atau inline):

| API field | Database source | Keterangan |
| --- | --- | --- |
| `customerId` | `customer_order.customer_id` | Foreign key untuk customer existing. Mutually exclusive secara domain dengan customer inline. |
| `customer.id` | `customer.id` | Dipakai bila customer inline sudah memiliki ID; bukan kolom order. |
| `customer.name` | `customer.name` | Insert/update customer saat resolve customer. |
| `customer.phone` | `customer.phone` | Kunci pencarian customer existing; direct mapping. |
| `customer.email` | `customer.email` | Fallback pencarian customer existing; direct mapping. |
| `customer.address` | `customer.address` | Direct mapping; dapat memperbarui alamat customer existing. |

Order:

| API field | Database source | Keterangan |
| --- | --- | --- |
| `sourceChannel` | `customer_order.source_channel` | Direct mapping, wajib. |
| `fulfillmentDate` | `customer_order.fulfillment_date` | Direct mapping. |
| `fulfillmentTime` | `customer_order.fulfillment_time` | Direct mapping. |
| `deliveryAddress` | `customer_order.delivery_address` | Direct mapping; berbeda dari alamat profil customer. |
| `items[]` | `order_item.*` | One-to-many; dibuat setelah row `customer_order`. |

Item (`items[]`):

| API field | Database source | Keterangan |
| --- | --- | --- |
| `items[].productId` | `order_item.product_id` | Foreign key ke `product.id`. |
| `items[].quantity` | `order_item.quantity` | Disimpan sebagai decimal. |
| `items[].uomId` | `order_item.uom_id` | Foreign key ke `uom.id`. |
| `items[].unitPrice` | `order_item.unit_price` | Input harga satuan; backend tetap menghitung subtotal. |
| `items[].statedBudget` | `order_item.stated_budget` | Input budget untuk screening; nullable. |
| `items[].customization` | `order_item.customization` | Direct mapping, nullable. |
| `items[].decorationType` | `order_item.decoration_type` | Enum decoration. |
| `items[].complexityScore` | `order_item.complexity_score` | Nullable integer 1–5. |
| `items[].sizePortion` | `order_item.size_portion` | Enum `small`/`medium`/`large`, nullable. |
| `items[].tierCount` | `order_item.tier_count` | Direct mapping; default `1`. |

Field server-managed atau dihitung:

| API field | Database source | Keterangan |
| --- | --- | --- |
| `id` | `customer_order.id` | UUID server-managed. |
| `orderNumber` | `customer_order.order_number` | Generated format `ORD-YYYYMMDD-XXXX`. |
| `status` | `customer_order.status` | `received` atau `requires_review` berdasarkan screening. |
| `subtotal` | `customer_order.subtotal` | Derived dari jumlah `order_item.quantity * unit_price`. |
| `total` | `customer_order.total` | Derived/final agreed total; bukan nilai kalkulasi client yang dipercaya. |
| `quotedTotal` | `customer_order.quoted_total` | Harga penawaran awal; nullable. |
| `negotiationStatus` | `customer_order.negotiation_status` | Enum, nullable. |
| `trackingToken` | `customer_order.tracking_token` | Generated 24 random bytes (192-bit); jangan diekspos pada response internal sembarangan. |
| `pricelistSnapshotId` | `customer_order.pricelist_snapshot_id` | Foreign key ke `price_list_snapshot.id`. |
| `createdAt`, `updatedAt` | `customer_order.created_at`, `.updated_at` | Server-managed. |

### 7.3 Detail order dan sub-resource

#### `OrderDetailResponse`

| API field | Database source | Keterangan |
| --- | --- | --- |
| order scalar fields | `customer_order.*` | Direct mapping dengan camelCase. |
| `customer.*` | `customer.*` | JOIN `customer_order.customer_id = customer.id`. |
| `items[]` | `order_item.*` | One-to-many melalui `order_item.order_id`. |
| `items[].product` | `product.id`, `product.name`, `product.base_price` | JOIN melalui `order_item.product_id`. |
| `items[].uom` | `uom.id`, `uom.name`, `uom.symbol` | JOIN melalui `order_item.uom_id`. |
| `statusHistory[]` | `order_status_history.*` | One-to-many melalui `order_id`, urut `changed_at` descending. |
| `statusHistory[].user` | `user.name`, `user.email` | Nullable JOIN melalui `changed_by`. |
| `reviews[]` | `order_review.*` | One-to-many melalui `order_id`. |
| `payments[]` | `payment.*` | One-to-many melalui `payment.order_id`. |
| `productionSlots[]` | `order_production_slot` + `production_slot` | Many-to-many melalui junction. |
| `reminders[]` | `order_reminder.*` | One-to-many melalui `order_id`. |
| `notificationLogs[]` | `notification_log.*` | One-to-many melalui `order_id`; internal/admin only. |
| `priceListSnapshot` | `price_list_snapshot.*` | JOIN melalui `pricelist_snapshot_id`; `snapshotData` JSONB. |

#### Field utama sub-resource

| Sub-resource | API field utama | Database source |
| --- | --- | --- |
| Items | item fields (lihat 7.2) | `order_item.*` |
| Status history | `id`, `oldStatus`, `newStatus`, `changedAt`, `changedBy`, `user` | `order_status_history` + `user` |
| Reviews | `reason`, `status`, `reviewedBy`, `reviewedAt`, `notes` | `order_review.*` (review screening) |
| Reminders | `reminderNumber`, `channel`, `scheduledAt`, `sentAt`, `status` | `order_reminder.*` (reminder terjadwal) |
| Payments | `amount`, `paymentMethod`, `proofUrl`, `status`, `paidAt` | `payment.*` |
| Production slots | `productionSlotId`, slot fields | `order_production_slot` + `production_slot` (junction many-to-many) |

#### Payment summary

`GET /api/orders/:id/payments` menambahkan field turunan berikut. Berbeda dari
aturan decimal-sebagai-string, `summary` berupa number karena merupakan DTO
yang menghitung.

| API field | Database source | Keterangan |
| --- | --- | --- |
| `data[]` | `payment.*` | Daftar pembayaran order. |
| `summary.totalOrder` | `customer_order.total` | Decimal dikonversi ke number. |
| `summary.totalPaid` | `SUM(payment.amount)` dengan `status = verified` | Derived. |
| `summary.balanceDue` | `totalOrder - totalPaid` | Derived, minimum `0`. |

#### `GET /api/orders/:id/status-history`

Endpoint audit perubahan status. Tidak mengubah stok.

```json
{
  "data": [
    {
      "id": "history-uuid",
      "orderId": "order-uuid",
      "oldStatus": "confirmed",
      "newStatus": "in_production",
      "changedAt": "2026-11-05T06:10:00.000Z",
      "changedBy": "user-uuid",
      "user": {
        "name": "Admin",
        "email": "admin@cakeshop.local"
      }
    }
  ]
}
```

### 7.4 `PATCH /api/orders/:id/status` dan konsumsi stok

Mengubah status order. Endpoint ini adalah satu-satunya trigger publik untuk
konsumsi ingredient ketika target status adalah `in_production`; tidak perlu
endpoint `POST /consume-stock` terpisah.

#### Request

Headers:

```http
Content-Type: application/json
Cookie: ck_token=<session-token>; ck_csrf=<csrf-token>
X-CSRF-Token: <csrf-token>
```

Path parameter:

| Parameter | Tipe | Wajib | Keterangan |
| --- | --- | --- | --- |
| `id` | UUID | Ya | `customer_order.id`. |

Body:

```json
{
  "status": "in_production"
}
```

Schema:

```text
status: enum[
  received,
  confirmed,
  requires_review,
  in_production,
  ready,
  out_for_delivery,
  completed,
  cancelled_no_response,
  cancelled_other
]
```

#### Response `200 OK`

```json
{
  "data": {
    "id": "order-uuid",
    "customerId": "customer-uuid",
    "orderNumber": "ORD-20261105-A8F2",
    "sourceChannel": "whatsapp",
    "status": "in_production",
    "fulfillmentDate": "2026-11-08",
    "fulfillmentTime": "14:00:00",
    "deliveryAddress": "Jl. Melati No. 12",
    "subtotal": "250000.00",
    "total": "250000.00",
    "trackingToken": "server-generated-token",
    "createdAt": "2026-11-05T06:00:00.000Z",
    "updatedAt": "2026-11-05T06:10:00.000Z"
  }
}
```

`data` berasal dari row `customer_order` setelah update. Detail konsumsi stok
tidak dicampur ke response status agar kontrak order tetap stabil. Jika UI
memerlukan audit stok, gunakan [`GET /api/stock-transactions`](#63-stock-transaction).

#### Aturan transisi

| Status saat ini | Target | Hasil |
| --- | --- | --- |
| `received` | `in_production` | Konsumsi ingredient lalu ubah status. |
| `confirmed` | `in_production` | Konsumsi ingredient lalu ubah status. |
| `requires_review` | `in_production` | Ditolak sampai review disetujui. |
| `in_production` | `in_production` | Idempotent; tidak konsumsi ulang. |
| Status lain | `in_production` | Ditolak jika aturan lifecycle belum mengizinkan transisi tersebut. |
| Apa pun | Selain `in_production` | Update status tanpa konsumsi ingredient. |

#### Konsumsi ingredient

Saat status order berubah ke `in_production`, backend mengambil setiap
`order_item`, resep produk terkait, dan `recipe_ingredient`. Kebutuhan bahan
dihitung sebagai `recipe_ingredient.quantity * order_item.quantity`, lalu
dikonversi dari `recipe_ingredient.uom_id` ke `ingredient.purchase_uom_id`
melalui `uom_conversion`.

| Field/proses | Database source | Keterangan |
| --- | --- | --- |
| Order item yang diproses | `order_item.order_id` | Semua item order dihitung dalam transaksi status yang sama. |
| Resep produk | `recipe.product_id` | Resep aktif/terlama yang tersedia dipakai sampai snapshot resep ditambahkan. |
| Kebutuhan bahan | `recipe_ingredient.quantity * order_item.quantity` | Derived; dikonversi ke unit pembelian. |
| Stok sebelum/sesudah | `ingredient.current_stock` | Row ingredient dikunci (`FOR UPDATE`) dan stok dikurangi atomik. |
| Audit konsumsi | `stock_transaction` | Satu row per ingredient, `transaction_type = out`, `order_id` terisi. |
| Low-stock alert | `stock_alert` | Dibuat jika stok sesudah konsumsi berada pada/di bawah `minimum_stock`, tanpa duplikasi alert unresolved. |

Transisi selain ke `in_production` tidak mengurangi ingredient. Jika order
keluar dari `in_production` lalu masuk lagi, audit `stock_transaction` untuk
order tersebut mencegah pengurangan kedua. Jika stok tidak cukup atau konversi
UOM tidak tersedia, seluruh transaksi status dibatalkan dan status order tetap.

#### Atomicity dan idempotensi

Ketika `status` target adalah `in_production`, server wajib menjalankan
langkah berikut dalam **satu transaksi database**:

1. Lock `customer_order` dan validasi transisi.
2. Ambil semua `order_item` dan recipe ingredient.
3. Konversi UOM ke `ingredient.purchase_uom_id`.
4. Lock setiap row `ingredient`.
5. Validasi stok mencukupi.
6. Update `ingredient.current_stock`.
7. Insert `stock_transaction` dengan `transaction_type = out` dan
   `order_id = :id`.
8. Insert `stock_alert` jika melewati threshold.
9. Update status order dan insert `order_status_history`.
10. Commit seluruh perubahan.

Jika satu langkah gagal, tidak ada status, stok, transaksi audit, atau alert
yang tersimpan. Request yang diulang tidak boleh mengurangi stok dua kali.
Server mengenali konsumsi yang sudah berhasil dari transaksi `out` dengan
`stock_transaction.order_id = :id`.

#### Error response

| HTTP | `error.code` | Kondisi |
| --- | --- | --- |
| `400` | `VALIDATION_ERROR` | UUID/status invalid, resep tidak ditemukan, atau konversi UOM tidak tersedia. |
| `400` | `VALIDATION_ERROR` | Order `requires_review` langsung diminta ke `in_production`. |
| `401` | `UNAUTHORIZED` | Session tidak valid/tidak ada. |
| `403` | `CSRF_FAILED` atau `FORBIDDEN` | CSRF tidak valid atau role tidak diizinkan. |
| `404` | `NOT_FOUND` | Order tidak ditemukan. |
| `409` | `CONFLICT` | Stok ingredient tidak mencukupi. |
| `500` | `INTERNAL_ERROR` | Kegagalan database atau infrastruktur lain. |

Contoh stok tidak cukup:

```json
{
  "error": {
    "code": "CONFLICT",
    "message": "Stok ingredient <ingredient-id> tidak mencukupi untuk produksi order"
  }
}
```

### 7.5 Customer

Resource: `GET/POST/PATCH/DELETE /api/customers[/:id]` (CRUD reusable).

| API field | Database source | Keterangan |
| --- | --- | --- |
| `id`, `name`, `email`, `phone`, `address` | `customer.id`, `.name`, `.email`, `.phone`, `.address` | Direct mapping. |
| `createdAt`, `updatedAt` | `customer.created_at`, `customer.updated_at` | Server-managed. |
| `orders[]` | `customer_order.*` | One-to-many melalui `customer_order.customer_id`; ditambahkan pada detail/history, bukan row customer dasar. |

### 7.6 Receipt DTO

Receipt adalah view/payload presentasi, bukan tabel baru.

| API field | Database source | Keterangan |
| --- | --- | --- |
| `orderNumber`, `orderDate` | `customer_order.order_number`, `.created_at` | Direct/format tanggal. |
| `customerName`, `customerPhone` | `customer.name`, `customer.phone` | JOIN dari order ke customer. |
| `deliveryAddress`, `sourceChannel`, `fulfillmentDate`, `fulfillmentTime` | Kolom terkait `customer_order` | Direct mapping. |
| `items[].productName` | `product.name` melalui `order_item.product_id` | JOIN. |
| `items[].quantity`, `unitPrice`, `subtotal` | `order_item.quantity`, `.unit_price`, `.subtotal` | Direct mapping. |
| `items[].details` | `order_item.customization` + detail dekorasi | Derived presentation field. |
| `subtotal`, `total` | `customer_order.subtotal`, `.total` | Direct mapping. |
| `totalPaid` | Verified `payment.amount` aggregate | Derived. |
| `balanceDue` | `total - totalPaid` | Derived. |
| `paymentStatus` | `payment.status` aggregate | Derived; bukan satu kolom order. |
| `trackingUrl` | `customer_order.tracking_token` | Derived URL; token harus diperlakukan sebagai secret capability. |
| `storeName`, `storePhone`, `storeAddress` | Konfigurasi aplikasi | Bukan sumber tabel domain saat ini. |

## 8. Public tracking

`GET /api/tracking/:token` — `TrackingResponse`. Endpoint ini public (tanpa
auth/CSRF) dan saat ini masih stub. Token pada path minimal 8 karakter; lookup
memakai exact match `customer_order.tracking_token`. Token invalid menghasilkan
`404 NOT_FOUND`.

| API field | Database source | Keterangan |
| --- | --- | --- |
| `orderNumber` | `customer_order.order_number` | Boleh ditampilkan sebagai identitas order. |
| `status` | `customer_order.status` | Direct mapping. |
| `fulfillmentDate` | `customer_order.fulfillment_date` | Estimasi tanggal selesai/pengambilan. |
| `fulfillmentTime` | `customer_order.fulfillment_time` | Estimasi waktu. |
| `items[]` | `order_item` + `product.name` | Ringkasan item saja. |
| `items[].productName` | `product.name` | JOIN. |
| `items[].quantity` | `order_item.quantity` | Direct mapping. |
| `items[].customization` | `order_item.customization` | Opsional; hanya jika memang diperlukan untuk tracking. |

Contoh response:

```json
{
  "data": {
    "orderNumber": "ORD-20261105-A8F2",
    "status": "in_production",
    "fulfillmentDate": "2026-11-08",
    "fulfillmentTime": "14:00:00",
    "items": [
      { "productName": "Chocolate Cake", "quantity": "1.000" }
    ]
  }
}
```

**Jangan** mengembalikan: `customer.phone`, `customer.email`, alamat lengkap,
`trackingToken`, harga internal, riwayat status internal, catatan review,
payment, atau data customer lain.

## 9. Finance dan pricing

Seluruh resource berikut memakai role `admin` dan kontrak
[CRUD reusable](#3-kontrak-crud-reusable).

### 9.1 Field mapping

| Resource | Field API | Database source | Keterangan |
| --- | --- | --- | --- |
| Payment | `id`, `orderId`, `amount`, `paymentMethod`, `proofUrl`, `status`, `paidAt`, `createdAt` | `payment.id`, `.order_id`, `.amount`, `.payment_method`, `.proof_url`, `.status`, `.paid_at`, `.created_at` | Direct mapping; `orderId` FK ke `customer_order`. |
| Financial transaction | `id`, `orderId`, `type`, `category`, `amount`, `transactionDate`, `description`, `createdAt` | `financial_transaction.*` | Direct mapping; `orderId` nullable FK. |
| Product cost | `id`, `productId`, `materialCost`, `laborCost`, `toolDepreciation`, `complexityMultiplier`, `riskBufferPercentage`, `hpp`, `calculatedAt` | `product_cost.*` | Direct mapping; `productId` FK. |
| Pricing rule | `id`, `productId`, `targetMarginPercentage`, `updatedAt` | `pricing_rule.*` | `productId` nullable: `NULL` berarti default global. |
| Product price | `id`, `productId`, `hpp`, `targetMargin`, `recommendedPrice`, `calculatedAt` | `product_price.*` | Direct mapping; hasil kalkulasi tersimpan. |
| Price recommendation | `id`, `orderItemId`, `complexityInput`, `materialCostInput`, `scaleInput`, `turnaroundInput`, `recommendedPrice`, `method`, `calculatedAt` | `price_recommendation.*` | Per-order-item model run; `orderItemId` FK. Belum ada route khusus. |
| Sales forecast | `id`, `productId`, `forecastDate`, `recommendedQuantity`, `confidenceScore`, `method`, `createdAt` | `sales_forecast.*` | Direct mapping; `productId` FK dan unik bersama `forecastDate`. |

JOIN opsional pada response:

| API field | Database source | Keterangan |
| --- | --- | --- |
| `product` | `product.*` | JOIN `product_cost`, `pricing_rule`, `product_price`, atau `sales_forecast` melalui `product_id`. |
| `order` | `customer_order.*` | JOIN payment/financial transaction melalui `order_id`. |
| `orderItem` | `order_item.*` | JOIN price recommendation melalui `order_item_id`. |

### 9.2 Endpoint

| Endpoint | Body writable | Database | Catatan |
| --- | --- | --- | --- |
| `GET/POST/PATCH/DELETE /api/payments[/:id]` | `orderId`, `amount`, `paymentMethod`, `proofUrl?`, `status?` | `payment` | Untuk payment per order, prefer sub-resource `/api/orders/:id/payments`. |
| `GET/POST/PATCH/DELETE /api/financial-transactions[/:id]` | `orderId?`, `type`, `category`, `amount`, `transactionDate`, `description?` | `financial_transaction` | — |
| `GET/POST/PATCH/DELETE /api/product-costs[/:id]` | `productId`, `materialCost`, `laborCost`, `toolDepreciation`, `complexityMultiplier`, `riskBufferPercentage`, `hpp` | `product_cost` | — |
| `GET/POST/PATCH/DELETE /api/pricing-rules[/:id]` | `productId?`, `targetMarginPercentage` | `pricing_rule` | `productId = null` adalah default global. |
| `GET/POST/PATCH/DELETE /api/product-prices[/:id]` | `productId`, `hpp`, `targetMargin`, `recommendedPrice` | `product_price` | — |
| `GET/POST/PATCH/DELETE /api/sales-forecasts[/:id]` | `productId`, `forecastDate`, `recommendedQuantity`, `confidenceScore`, `method` | `sales_forecast` | — |

Semua decimal uang dan quantity dikirim sebagai string decimal untuk menjaga
presisi. Nilai margin/confidence berada pada rentang `0..1` sesuai constraint
database.

### 9.3 Laporan laba/rugi

Laporan laba/rugi adalah derived view dari transaksi income/expense, HPP, dan
filter tanggal/order/product. Endpoint laporan dan ekspor PDF/Excel belum
terdaftar; kontrak targetnya:

| Endpoint target | Query | Response |
| --- | --- | --- |
| `GET /api/reports/profit-loss` | `from`, `to`, `productId?`, `orderId?` | `{ data: { income, expenses, cogs, profit, rows[] }, filters }`. |
| `GET /api/reports/profit-loss/export` | Filter sama + `format=pdf\|xlsx` | File download dengan `Content-Type` sesuai format. |

## 10. Marketing

Semua resource memakai [CRUD reusable](#3-kontrak-crud-reusable) (role
admin/staff).

| Resource | Endpoint | Field API | Database source | Keterangan |
| --- | --- | --- | --- | --- |
| Content | `/api/content` | `id`, `title`, `content`, `platform`, `status`, `scheduledDate`, `createdAt`, `updatedAt` | `content.*` | Status `planned`/`posted`/`skipped`. Body writable: `title`, `content`, `platform`, `status?`, `scheduledDate?`. |
| Value proposition | `/api/value-propositions` | `id`, `title`, `content`, `isActive`, `createdAt` | `value_proposition_template.*` | Body writable: `title`, `content`, `isActive?`. |
| Product value proposition | `PUT /api/products/:id/value-propositions` | `productId`, `templateId` | `product_value_proposition.*` | Junction many-to-many; body `{ templateIds: UUID[] }`. Belum ada route di `app.ts`. |
| Portfolio | `/api/portfolio` | `id`, `productId`, `description`, `imageUrl`, `workDate`, `createdAt` | `portfolio.*` | `productId` FK. Body writable: `productId`, `description?`, `imageUrl`, `workDate`. |

JOIN:

| API field | Database source | Keterangan |
| --- | --- | --- |
| `portfolio.product` | `product.*` | JOIN melalui `portfolio.product_id`. |
| `product.valuePropositions[]` | Junction + `value_proposition_template` | JOIN many-to-many. |

## 11. Users dan dashboard

### 11.1 Users

Resource: `GET/POST/PATCH/DELETE /api/users[/:id]` (admin; CRUD reusable).

| API field | Database source | Keterangan |
| --- | --- | --- |
| `id`, `name`, `email`, `role`, `isActive`, `createdAt`, `updatedAt` | `user.*` kecuali password | Direct mapping. |
| `password` | `user.password_hash` | Input saja; hash disimpan, password mentah tidak pernah dikembalikan (*Not exposed*). |

### 11.2 Dashboard

`GET /api/dashboard/summary` — auth admin; saat ini mengembalikan `501`.
Query rekomendasi: `from`, `to`.

Dashboard bukan satu tabel; setiap field response harus punya sumber eksplisit.

Response target:

```json
{
  "data": {
    "orders": { "total": 0, "byStatus": {} },
    "revenue": "0.00",
    "expenses": "0.00",
    "profit": "0.00",
    "lowStock": [],
    "pendingReviews": 0,
    "dueContent": [],
    "productionCapacity": { "capacity": 0, "reserved": 0, "available": 0 }
  },
  "filters": { "from": null, "to": null }
}
```

| Field | Database source | Keterangan |
| --- | --- | --- |
| `orders` | `COUNT(customer_order.id)` | Aggregate count/status, biasanya difilter periode/status. |
| `revenue` | `SUM(financial_transaction.amount)` (income) atau `SUM(customer_order.total)` | Derived; pilih satu definisi metrik dan konsisten. |
| `expenses` | `financial_transaction` (expense) | Aggregate. |
| `profit` | revenue − expenses − COGS | Derived. |
| `lowStock[]` | `ingredient` JOIN `stock_alert` | Filter `current_stock <= minimum_stock` atau alert belum resolved. |
| `pendingReviews` | `COUNT(order_review.id)` | Filter `status = 'pending'`. |
| `dueContent[]` | `content` | Filter `status = 'planned'` dan `scheduled_date`. |
| `productionCapacity` | `production_slot.capacity` dan `reserved_capacity` | Derived (`available = capacity - reserved`) dari slot yang tersedia. |

## 12. Health dan OpenAPI

| Endpoint | Auth | Response | Database |
| --- | --- | --- | --- |
| `GET /api/health` | Public | `{ status: "ok", service: "cakeshop-api", time: ISODate }` | Tidak membaca database. |
| `GET /api/swagger` | Public | OpenAPI JSON | Tidak membaca database. |
| `GET /api/docs` | Public | Swagger UI HTML | Tidak membaca database. |

## 13. Tabel database tanpa CRUD endpoint langsung

Tabel berikut tetap harus dipakai saat implementasi domain, walaupun belum
memiliki resource CRUD publik sendiri:

| Tabel | Dipakai oleh |
| --- | --- |
| `session` | Login, authentication, logout, idle timeout. |
| `product_category_map` | Attach kategori produk. |
| `uom_conversion` | Konversi unit resep ke unit pembelian. |
| `recipe_ingredient`, `recipe_tool`, `recipe_image` | Detail resep dan relasi produk. |
| `ingredient_price_history` | Riwayat perubahan harga dan recalculation HPP. |
| `price_list_snapshot` | Snapshot harga ketika order dibuat. |
| `order_status_history` | Audit perubahan status order. |
| `order_review` | Screening dan approval manual. |
| `order_reminder` | Reminder customer dan deadline respons. |
| `order_production_slot` | Reservasi slot produksi per order. |
| `notification_log` | Delivery log dan retry notifikasi. |
| `product_value_proposition` | Attach template value proposition ke produk. |
| `price_recommendation` | Input/output rekomendasi harga per item order. |

## 14. Catatan implementasi

1. Endpoint CRUD generik yang masih memakai `crud(label, middleware)` hanya
   memberi route/auth contract dan mengembalikan `501`. Label endpoint tidak
   selalu sama dengan nama tabel (contoh `products` → `product`,
   `financial-transactions` → `financial_transaction`).
2. `autoCrud` untuk `uoms` adalah pengecualian yang benar-benar melakukan
   `SELECT/INSERT/UPDATE/DELETE`; response-nya berbentuk `{ data: ... }` dan
   list memakai `{ data, pagination: { page, limit, total } }`.
3. SRS menetapkan RBAC, tracking token minimal 128-bit, snapshot pricelist,
   screening budget, pengurangan stok, notifikasi, dan ekspor laporan. Mapping
   ini mencatat sumber datanya, tetapi tidak menyatakan acceptance criteria
   tersebut sudah aktif sebelum handler domain dan test-nya diimplementasikan.