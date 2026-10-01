# Order Intake & Receipt Generation (Pencatatan Orderan & Pembuatan Nota) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membangun alur lengkap pencatatan pesanan kue (order intake multi-channel, kalkulasi subtotal/total, automated screening review) dan pembuatan nota pesanan (struk terstruktur, format teks WhatsApp siap kirim, printable HTML receipt) yang terintegrasi dengan pelacakan publik (tracking token) serta pencatatan pembayaran uang muka (DP).

**Architecture:** Modul ini menambahkan DTO/skema bersama di `packages/shared-schemas`, mengimplementasikan layanan domain di `apps/api/src/modules/order` (service transaksi Drizzle untuk intake pesanan, riwayat status, screening, pembayaran DP, dan nota generator) serta tracking publik di `apps/api/src/modules/tracking`, lalu melengkapinya dengan UI admin berbasis Next.js di `apps/web/src/app/orders` untuk intake form, preview nota/WhatsApp copy, dan tracking view publik di `apps/web/src/app/track/[token]`.

**Tech Stack:** Bun, Hono, Drizzle ORM, PostgreSQL, Zod / drizzle-zod, Next.js 15 (App Router), Tailwind CSS, bun:test.

**Spec:** `docs/srs.md` (FR-OCS-01, FR-OCS-02, FR-OCS-03, FR-OCS-05, FR-OCS-06, FR-OCS-07, FR-OCS-10, NFR-SEC-01, NFR-SEC-02, NFR-USA-02, NFR-USA-03).

## Global Constraints

- Primary language UI & receipt labels: Bahasa Indonesia (NFR-USA-02).
- Currency formatting: Seluruh harga dan kalkulasi menggunakan Indonesian Rupiah (IDR) tanpa desimal sen pada tampilan nota (contoh: `Rp 250.000`), format tanggal `DD/MM/YYYY` (NFR-USA-02).
- Tracking token entropy: Wajib berupa token non-guessable minimum 128-bit entropy (menggunakan default schema `encode(gen_random_bytes(24), 'hex')`) (NFR-SEC-02).
- Single source of truth database: Menggunakan skema Drizzle di `packages/database/src/schema/order.ts`, `finance.ts`, `user.ts`, `product.ts`.
- Role-based authorization: Endpoint intake dan nota membutuhkan role authenticated (`admin` atau `staff`), sedangkan tracking endpoint bersifat public read-only (NFR-SEC-01, FR-OCS-03).

## Review Focus

1. **Inline / Returning Customer Resolution:** Input pesanan dengan nomor telepon pelanggan yang sudah ada vs pelanggan baru — nomor telepon harus mencocokkan profil pelanggan yang ada (FR-OCS-05) tanpa membuat record duplikat, tetapi memperbarui alamat pengiriman jika diberikan.
2. **Kalkulasi & Snapshot Konsistensi:** Subtotal per item (`quantity * unit_price`) dan total order harus dikalkulasi di backend (tidak mempercayai kalkulasi client), dan pricelist snapshot harus dikaitkan saat pembuatan order (FR-OCS-07).
3. **Screening Rule (FR-OCS-06):** Jika pelanggan memilih item dengan dekorasi premium/custom dan menyatakan budget di bawah harga dasar/subtotal, status awal order otomatis diset ke `requires_review` dan mencatat entri di `order_review`, bukan langsung `received`/`confirmed`.
4. **Pembayaran Parsial (DP) & Sisa Tagihan Nota:** Perhitungan sisa tagihan pada nota (`total - total_paid`) harus akurat menangani kondisi: belum bayar (DP 0), bayar sebagian (DP), dan lunas.
5. **Kebocoran Data pada Tracking Publik:** Endpoint tracking publik `/api/tracking/:token` hanya boleh mengembalikan status pesanan, estimasi tanggal/waktu selesai, dan ringkasan item tanpa membocorkan nomor telepon, alamat lengkap, atau riwayat pelanggan lain (NFR-SEC-02, FR-OCS-03).

---

### Task 1: Shared Schemas & DTOs untuk Order Intake dan Nota

**Files:**
- Create: `packages/shared-schemas/src/schemas/receipt.ts`
- Modify: `packages/shared-schemas/src/schemas/order.ts`
- Modify: `packages/shared-schemas/src/schemas/index.ts`
- Modify: `packages/shared-schemas/src/index.ts`
- Test: `packages/shared-schemas/src/schemas/order.test.ts`

**Interfaces:**
- Consumes: `@bakery/database/schema` (customerOrder, orderItem, customer)
- Produces:
  - `CreateOrderItemInputSchema`: schema Zod untuk satu baris item kue
  - `CreateOrderWithCustomerInputSchema`: schema Zod untuk intake pesanan lengkap (info customer baru/lama + list items + metadata order)
  - `OrderReceiptSchema`: schema Zod untuk payload nota pesanan terstruktur
  - `OrderPaymentInputSchema`: schema Zod untuk pencatatan pembayaran/DP

- [ ] **Step 1: Write the failing test**

```typescript
// packages/shared-schemas/src/schemas/order.test.ts
import { describe, expect, test } from "bun:test";
import { CreateOrderWithCustomerInputSchema, OrderReceiptSchema } from "./order";

describe("Order & Receipt Schemas", () => {
  test("validates valid order intake payload", () => {
    const validPayload = {
      customer: {
        name: "Siti Rahma",
        phone: "081234567890",
        email: "siti@example.com",
        address: "Jl. Melati No. 12, Bandung",
      },
      sourceChannel: "whatsapp",
      fulfillmentDate: "2026-10-15",
      fulfillmentTime: "14:00:00",
      deliveryAddress: "Jl. Melati No. 12, Bandung",
      items: [
        {
          productId: "a0000000-0000-0000-0000-000000000001",
          quantity: 1,
          uomId: "b0000000-0000-0000-0000-000000000001",
          unitPrice: 250000,
          customization: "Tulisan: Selamat Ulang Tahun Ayah",
          decorationType: "fondant",
          sizePortion: "medium",
          tierCount: 1,
        },
      ],
    };

    const parsed = CreateOrderWithCustomerInputSchema.safeParse(validPayload);
    expect(parsed.success).toBe(true);
  });

  test("rejects order intake payload without sourceChannel or items", () => {
    const invalidPayload = {
      customer: { name: "Budi", phone: "08111" },
      items: [],
    };
    const parsed = CreateOrderWithCustomerInputSchema.safeParse(invalidPayload);
    expect(parsed.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test packages/shared-schemas/src/schemas/order.test.ts`
Expected: FAIL with "CreateOrderWithCustomerInputSchema is not defined"

- [ ] **Step 3: Implement schemas in `packages/shared-schemas`**

Definisikan:
1. `CreateOrderItemInputSchema` di `packages/shared-schemas/src/schemas/order.ts`:
   - `productId`: uuid
   - `quantity`: number positive
   - `uomId`: uuid
   - `unitPrice`: number non-negative
   - `statedBudget`: optional number
   - `customization`: optional string
   - `decorationType`: z.enum(['fondant', 'print', 'buttercream', 'painted', 'none']).default('none')
   - `sizePortion`: z.enum(['small', 'medium', 'large']).optional()
   - `tierCount`: z.number().int().min(1).default(1)
2. `CreateOrderWithCustomerInputSchema`:
   - `customerId`: optional uuid (jika memilih customer existing)
   - `customer`: optional object `{ name: string.min(2), phone: string.min(6), email?: string.email(), address?: string }` (wajib jika `customerId` tidak ada)
   - `sourceChannel`: z.string().min(1)
   - `fulfillmentDate`: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
   - `fulfillmentTime`: z.string().optional()
   - `deliveryAddress`: z.string().optional()
   - `items`: z.array(CreateOrderItemInputSchema).min(1, "Minimal 1 item pesanan")
3. `OrderReceiptSchema` di `packages/shared-schemas/src/schemas/receipt.ts` & export di index.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test packages/shared-schemas/src/schemas/order.test.ts`
Expected: PASS (2 tests pass)

- [ ] **Step 5: Commit**

```bash
git add packages/shared-schemas
git commit -m "feat(shared-schemas): add order intake and receipt DTO schemas"
```

---

### Task 2: Order Number Generator & Calculation Engine

**Files:**
- Create: `apps/api/src/modules/order/order-utils.ts`
- Test: `apps/api/src/modules/order/order-utils.test.ts`

**Interfaces:**
- Consumes: `CreateOrderItemInputSchema` items
- Produces:
  - `generateOrderNumber(date?: Date): string` -> format `ORD-YYYYMMDD-XXXX` (e.g. `ORD-20261001-A8F2`)
  - `calculateOrderTotals(items: Array<{ quantity: number; unitPrice: number }>): { subtotal: number; total: number }`
  - `evaluateScreeningRule(item: { decorationType: string; statedBudget?: number; unitPrice: number; quantity: number }): { requiresReview: boolean; reason?: string }`

- [ ] **Step 1: Write the failing test**

```typescript
// apps/api/src/modules/order/order-utils.test.ts
import { describe, expect, test } from "bun:test";
import { generateOrderNumber, calculateOrderTotals, evaluateScreeningRule } from "./order-utils";

describe("Order Utilities", () => {
  test("generates unique order number matching pattern", () => {
    const num = generateOrderNumber(new Date("2026-10-01T10:00:00Z"));
    expect(num).toMatch(/^ORD-20261001-[A-Z0-9]{4}$/);
  });

  test("calculates subtotal and total accurately", () => {
    const items = [
      { quantity: 2, unitPrice: 150000 },
      { quantity: 1, unitPrice: 75000 },
    ];
    const { subtotal, total } = calculateOrderTotals(items);
    expect(subtotal).toBe(375000);
    expect(total).toBe(375000);
  });

  test("flags order item for review if statedBudget is below unit price", () => {
    const check1 = evaluateScreeningRule({
      decorationType: "fondant",
      statedBudget: 150000,
      unitPrice: 250000,
      quantity: 1,
    });
    expect(check1.requiresReview).toBe(true);
    expect(check1.reason).toContain("Budget stated (150000) is below estimated price");

    const check2 = evaluateScreeningRule({
      decorationType: "none",
      statedBudget: 300000,
      unitPrice: 250000,
      quantity: 1,
    });
    expect(check2.requiresReview).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test apps/api/src/modules/order/order-utils.test.ts`
Expected: FAIL with "Cannot find module './order-utils'"

- [ ] **Step 3: Implement `order-utils.ts`**

Implementasikan:
- `generateOrderNumber(date = new Date())`: menghasilkan prefix tanggal `ORD-YYYYMMDD-` ditambah 4 karakter acak hex uppercase (`crypto.randomBytes(2).toString('hex').toUpperCase()`).
- `calculateOrderTotals(items)`: akumulasi `quantity * unitPrice`, membulatkan ke 2 desimal jika ada pecahan.
- `evaluateScreeningRule(item)`: jika `item.statedBudget != null` dan `item.statedBudget < (item.unitPrice * item.quantity)`, atau jika `item.decorationType === 'fondant'` dan `item.statedBudget < item.unitPrice`, return `{ requiresReview: true, reason: ... }`.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test apps/api/src/modules/order/order-utils.test.ts`
Expected: PASS (3 tests pass)

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/order/order-utils.ts apps/api/src/modules/order/order-utils.test.ts
git commit -m "feat(api/order): add order number generator and calculation utilities"
```

---

### Task 3: Order Intake & Customer Resolution Service

**Files:**
- Create: `apps/api/src/modules/order/services.ts`
- Modify: `apps/api/src/modules/order/routes.ts`
- Test: `apps/api/src/modules/order/order-intake.test.ts`

**Interfaces:**
- Consumes:
  - `CreateOrderWithCustomerInputSchema`
  - `generateOrderNumber`, `calculateOrderTotals`, `evaluateScreeningRule`
  - `@bakery/database` (db, customer, customerOrder, orderItem, orderStatusHistory, orderReview)
- Produces:
  - `createOrderWithItems(input, createdByUserId)`: function membuat customer jika belum ada, membuat customerOrder, items, orderStatusHistory, dan orderReview jika terpicu screening dalam 1 transaksi DB.
  - `getOrderById(orderId)`: mengambil data lengkap order beserta items, customer, status history, dan payments.
  - `listOrders(query)`: list order dengan filter `sourceChannel`, `status`, pagination.
  - API endpoint: `POST /api/orders` (intake) dan `GET /api/orders` (list), `GET /api/orders/:id` (detail).

- [ ] **Step 1: Write the failing test**

```typescript
// apps/api/src/modules/order/order-intake.test.ts
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { app } from "../../app";
import { authHeaders, dbReady, json, setupTestUsers } from "../../tests/helpers";
import { db } from "@bakery/database";
import { product, uom } from "@bakery/database/schema";

describe.skipIf(!dbReady)("Order Intake Service & API", () => {
  let ctx: any;
  let cleanupUsers: () => Promise<void>;
  let testProductId: string;
  let testUomId: string;

  beforeAll(async () => {
    const res = await setupTestUsers("order-intake");
    ctx = res.adminCtx;
    cleanupUsers = res.cleanup;

    // Seed 1 UOM & 1 Product for test
    const [u] = await db.insert(uom).values({ name: "Piece", abbreviation: "pcs" }).returning();
    testUomId = u.id;
    const [p] = await db.insert(product).values({
      name: "Custom Birthday Cake",
      productionType: "unit",
      marketSegment: "premium_artisan",
      basePrice: "250000",
    }).returning();
    testProductId = p.id;
  });

  afterAll(async () => {
    if (cleanupUsers) await cleanupUsers();
  });

  test("POST /api/orders creates order, customer, items, and status history", async () => {
    const payload = {
      customer: {
        name: "Dewi Lestari",
        phone: "081999888777",
        email: "dewi@example.com",
        address: "Jl. Riau No. 45",
      },
      sourceChannel: "whatsapp",
      fulfillmentDate: "2026-10-20",
      fulfillmentTime: "15:00:00",
      deliveryAddress: "Jl. Riau No. 45",
      items: [
        {
          productId: testProductId,
          quantity: 1,
          uomId: testUomId,
          unitPrice: 250000,
          customization: "Tema bunga sakura",
          decorationType: "buttercream",
          sizePortion: "medium",
          tierCount: 1,
        },
      ],
    };

    const res = await app.request("/api/orders", {
      method: "POST",
      headers: authHeaders(ctx, { "content-type": "application/json" }),
      body: JSON.stringify(payload),
    });

    expect(res.status).toBe(201);
    const body = await json(res);
    expect(body.data).toBeDefined();
    expect(body.data.orderNumber).toMatch(/^ORD-/);
    expect(body.data.status).toBe("received");
    expect(body.data.total).toBe("250000.00");
    expect(body.data.items).toHaveLength(1);
    expect(body.data.customer.phone).toBe("081999888777");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test apps/api/src/modules/order/order-intake.test.ts`
Expected: FAIL with HTTP 501 (karena route masih `crud('orders', authenticate)`).

- [ ] **Step 3: Implement `createOrderWithItems` and routes in `apps/api/src/modules/order`**

1. Di `apps/api/src/modules/order/services.ts`:
   - Gunakan `db.transaction(async (tx) => { ... })`:
     - Cari customer berdasarkan `phone` atau `email`. Jika ada, gunakan ID-nya. Jika tidak ada, `tx.insert(customer).values(...).returning()`.
     - Hitung subtotal dan total menggunakan `calculateOrderTotals(items)`.
     - Cek screening rule untuk setiap item. Jika ada item yang trigger screening, status awal adalah `'requires_review'`. Jika tidak ada, status awal `'received'`.
     - Insert `tx.insert(customerOrder).values(...)`.
     - Insert `tx.insert(orderItem).values(...)`.
     - Insert `tx.insert(orderStatusHistory).values({ orderId, oldStatus: null, newStatus: status, changedBy: createdByUserId })`.
     - Jika status `'requires_review'`, insert `tx.insert(orderReview).values({ orderId, reason: ..., status: 'pending' })`.
     - Return order lengkap.
2. Di `apps/api/src/modules/order/routes.ts`:
   - Gantikan router stub `orderRoutes` dengan route handlers untuk:
     - `POST /api/orders`: validasi dengan `CreateOrderWithCustomerInputSchema`, panggil `createOrderWithItems`.
     - `GET /api/orders`: list orders dengan filter pagination & status.
     - `GET /api/orders/:id`: detail order lengkap.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test apps/api/src/modules/order/order-intake.test.ts`
Expected: PASS (1 test pass)

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/order/services.ts apps/api/src/modules/order/routes.ts apps/api/src/modules/order/order-intake.test.ts
git commit -m "feat(api/order): implement order intake service with customer resolution and screening"
```

---

### Task 4: Order Status Lifecycle & History Management (FR-OCS-02)

**Files:**
- Modify: `apps/api/src/modules/order/services.ts`
- Modify: `apps/api/src/modules/order/routes.ts`
- Test: `apps/api/src/modules/order/order-status.test.ts`

**Interfaces:**
- Consumes: `orderStatusEnum`
- Produces:
  - `updateOrderStatus(orderId, newStatus, changedByUserId)`: function merubah status order dan mencatat baris baru di `order_status_history`.
  - Endpoint: `PATCH /api/orders/:id/status` dan `GET /api/orders/:id/status-history`

- [ ] **Step 1: Write the failing test**

```typescript
// apps/api/src/modules/order/order-status.test.ts
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { app } from "../../app";
import { authHeaders, dbReady, json, setupTestUsers } from "../../tests/helpers";
import { db } from "@bakery/database";
import { customer, customerOrder } from "@bakery/database/schema";

describe.skipIf(!dbReady)("Order Status Lifecycle (FR-OCS-02)", () => {
  let ctx: any;
  let cleanupUsers: () => Promise<void>;
  let testOrderId: string;

  beforeAll(async () => {
    const res = await setupTestUsers("order-status");
    ctx = res.adminCtx;
    cleanupUsers = res.cleanup;

    const [c] = await db.insert(customer).values({ name: "Rina", phone: "081223344" }).returning();
    const [ord] = await db.insert(customerOrder).values({
      customerId: c.id,
      orderNumber: "ORD-TEST-STATUS-1",
      sourceChannel: "instagram",
      status: "received",
      total: "100000",
      subtotal: "100000",
    }).returning();
    testOrderId = ord.id;
  });

  afterAll(async () => {
    if (cleanupUsers) await cleanupUsers();
  });

  test("PATCH /api/orders/:id/status updates status and logs history", async () => {
    const res = await app.request(`/api/orders/${testOrderId}/status`, {
      method: "PATCH",
      headers: authHeaders(ctx, { "content-type": "application/json" }),
      body: JSON.stringify({ status: "confirmed" }),
    });

    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.data.status).toBe("confirmed");

    // Check status history
    const histRes = await app.request(`/api/orders/${testOrderId}/status-history`, {
      method: "GET",
      headers: authHeaders(ctx),
    });
    expect(histRes.status).toBe(200);
    const histBody = await json(histRes);
    expect(histBody.data.length).toBeGreaterThanOrEqual(1);
    expect(histBody.data[0].newStatus).toBe("confirmed");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test apps/api/src/modules/order/order-status.test.ts`
Expected: FAIL with HTTP 404/501.

- [ ] **Step 3: Implement status update and history logging**

1. Di `apps/api/src/modules/order/services.ts`:
   - Buat `updateOrderStatus(orderId, newStatus, userId)` dalam transaksi:
     - Ambil current order: pastikan ada, dapatkan `oldStatus`.
     - Validasi transisi status (misal dari `requires_review` tidak bisa langsung `in_production` sebelum approval).
     - Update status pada `customerOrder`.
     - Insert ke `orderStatusHistory` (`orderId, oldStatus, newStatus, changedBy: userId`).
   - Buat `getOrderStatusHistory(orderId)`: query `orderStatusHistory` join `user` urut `changedAt` descending.
2. Di `apps/api/src/modules/order/routes.ts`:
   - Hubungkan `PATCH /api/orders/:id/status` dan `GET /api/orders/:id/status-history`.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test apps/api/src/modules/order/order-status.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/order/services.ts apps/api/src/modules/order/routes.ts apps/api/src/modules/order/order-status.test.ts
git commit -m "feat(api/order): add status transition lifecycle and history logging"
```

---

### Task 5: Order Payment & Down Payment (DP) Logging

**Files:**
- Modify: `apps/api/src/modules/order/services.ts`
- Modify: `apps/api/src/modules/order/routes.ts`
- Test: `apps/api/src/modules/order/order-payment.test.ts`

**Interfaces:**
- Consumes: `payment` table from `@bakery/database/schema`
- Produces:
  - `recordOrderPayment(orderId, { amount, paymentMethod, proofUrl, status })`
  - `getOrderPayments(orderId)`: mengembalikan daftar pembayaran dan ringkasan `totalPaid` serta `balanceDue`.
  - API endpoint: `POST /api/orders/:id/payments` dan `GET /api/orders/:id/payments`

- [ ] **Step 1: Write the failing test**

```typescript
// apps/api/src/modules/order/order-payment.test.ts
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { app } from "../../app";
import { authHeaders, dbReady, json, setupTestUsers } from "../../tests/helpers";
import { db } from "@bakery/database";
import { customer, customerOrder } from "@bakery/database/schema";

describe.skipIf(!dbReady)("Order Payment & DP Recording", () => {
  let ctx: any;
  let cleanupUsers: () => Promise<void>;
  let testOrderId: string;

  beforeAll(async () => {
    const res = await setupTestUsers("order-pay");
    ctx = res.adminCtx;
    cleanupUsers = res.cleanup;

    const [c] = await db.insert(customer).values({ name: "Agus", phone: "081334455" }).returning();
    const [ord] = await db.insert(customerOrder).values({
      customerId: c.id,
      orderNumber: "ORD-PAY-TEST-1",
      sourceChannel: "walk_in",
      status: "received",
      total: "500000",
      subtotal: "500000",
    }).returning();
    testOrderId = ord.id;
  });

  afterAll(async () => {
    if (cleanupUsers) await cleanupUsers();
  });

  test("POST /api/orders/:id/payments records down payment (DP) and calculates remaining balance", async () => {
    const res = await app.request(`/api/orders/${testOrderId}/payments`, {
      method: "POST",
      headers: authHeaders(ctx, { "content-type": "application/json" }),
      body: JSON.stringify({
        amount: 250000,
        paymentMethod: "transfer_bca",
        status: "verified",
      }),
    });

    expect(res.status).toBe(201);
    const body = await json(res);
    expect(body.data.amount).toBe("250000.00");
    expect(body.data.status).toBe("verified");

    // Fetch payments summary
    const summaryRes = await app.request(`/api/orders/${testOrderId}/payments`, {
      method: "GET",
      headers: authHeaders(ctx),
    });
    const summaryBody = await json(summaryRes);
    expect(summaryBody.summary.totalOrder).toBe(500000);
    expect(summaryBody.summary.totalPaid).toBe(250000);
    expect(summaryBody.summary.balanceDue).toBe(250000);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test apps/api/src/modules/order/order-payment.test.ts`
Expected: FAIL with HTTP 501.

- [ ] **Step 3: Implement payment recording and balance calculation**

1. Di `apps/api/src/modules/order/services.ts`:
   - Implementasikan `recordOrderPayment(orderId, paymentData)`: insert ke `payment`.
   - Implementasikan `getOrderPaymentsSummary(orderId)`: ambil semua pembayaran `payment` untuk order tersebut, hitung `totalPaid = sum(amount)` yang berstatus `'verified'` (atau total semua pembayaran), `balanceDue = totalOrder - totalPaid`.
2. Di `apps/api/src/modules/order/routes.ts`:
   - Implementasikan `orderPaymentRoutes`:
     - `POST /:id/payments`: validasi body `{ amount, paymentMethod, proofUrl?, status? }`, insert & return.
     - `GET /:id/payments`: return daftar pembayaran + summary `{ totalOrder, totalPaid, balanceDue }`.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test apps/api/src/modules/order/order-payment.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/order/services.ts apps/api/src/modules/order/routes.ts apps/api/src/modules/order/order-payment.test.ts
git commit -m "feat(api/order): implement order payment and DP recording with balance summary"
```

---

### Task 6: Nota (Receipt) Generation Engine (Structured JSON, WhatsApp Text, HTML Print)

**Files:**
- Create: `apps/api/src/modules/order/receipt.ts`
- Modify: `apps/api/src/modules/order/routes.ts`
- Test: `apps/api/src/modules/order/receipt.test.ts`

**Interfaces:**
- Consumes:
  - `getOrderById`, `getOrderPaymentsSummary`
  - Store metadata configuration (`env.BAKERY_NAME`, phone, address)
- Produces:
  - `generateReceiptData(orderId)`: mengembalikan objek terstruktur nota pesanan lengkap.
  - `formatReceiptAsWhatsAppText(receiptData)`: mengembalikan string teks ramah WhatsApp dengan bullet, tebal, dan format Rupiah rapi.
  - `formatReceiptAsHtml(receiptData)`: mengembalikan template HTML struk siap cetak (80mm/standard slip).
  - API endpoints:
    - `GET /api/orders/:id/receipt`: mengembalikan JSON `{ receipt: receiptData, whatsappText: string }`
    - `GET /api/orders/:id/receipt/print`: mengembalikan HTML response dengan `content-type: text/html`

- [ ] **Step 1: Write the failing test**

```typescript
// apps/api/src/modules/order/receipt.test.ts
import { describe, expect, test } from "bun:test";
import { formatReceiptAsWhatsAppText, formatReceiptAsHtml } from "./receipt";

describe("Receipt (Nota) Formatter", () => {
  const mockReceipt = {
    storeName: "Bakery Delight",
    storePhone: "08123456789",
    storeAddress: "Jl. Dago No. 100, Bandung",
    orderNumber: "ORD-20261001-ABCD",
    orderDate: "01/10/2026",
    customerName: "Siti Rahma",
    customerPhone: "081234567890",
    deliveryAddress: "Jl. Melati No. 12, Bandung",
    sourceChannel: "WhatsApp",
    fulfillmentDate: "15/10/2026",
    fulfillmentTime: "14:00 WIB",
    items: [
      {
        productName: "Kue Tart Ulang Tahun",
        quantity: 1,
        unitPrice: 250000,
        subtotal: 250000,
        details: "Fondant, Ukuran Medium, 1 Tingkat. Catatan: Selamat Ulang Tahun",
      },
    ],
    subtotal: 250000,
    total: 250000,
    totalPaid: 100000,
    balanceDue: 150000,
    paymentStatus: "DP Dibayar",
    trackingUrl: "https://cakeshop.local/track/abc123token",
  };

  test("generates WhatsApp formatted receipt text", () => {
    const text = formatReceiptAsWhatsAppText(mockReceipt);
    expect(text).toContain("*NOTA PESANAN - BAKERY DELIGHT*");
    expect(text).toContain("No. Pesanan : ORD-20261001-ABCD");
    expect(text).toContain("Pelanggan   : Siti Rahma");
    expect(text).toContain("Rp 250.000");
    expect(text).toContain("Sisa Tagihan: Rp 150.000");
    expect(text).toContain("Link Lacak  : https://cakeshop.local/track/abc123token");
  });

  test("generates HTML print template with clean receipt structure", () => {
    const html = formatReceiptAsHtml(mockReceipt);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("ORD-20261001-ABCD");
    expect(html).toContain("Rp 250.000");
    expect(html).toContain("window.print()");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test apps/api/src/modules/order/receipt.test.ts`
Expected: FAIL with "Cannot find module './receipt'".

- [ ] **Step 3: Implement `receipt.ts` and routes**

1. Di `apps/api/src/modules/order/receipt.ts`:
   - Implementasikan fungsi format mata uang IDR helper: `formatIdr(num) => 'Rp ' + num.toLocaleString('id-ID')`.
   - Implementasikan `generateReceiptData(orderId)`: mengambil data order, customer, items, dan payments summary. Menyusun tracking link lengkap menggunakan `env.BASE_WEB_URL` atau fallback `/track/${order.trackingToken}`.
   - Implementasikan `formatReceiptAsWhatsAppText(data)`: menyusun pesan WhatsApp dengan format:
     ```text
     🧾 *NOTA PESANAN - [STORE]*
     ━━━━━━━━━━━━━━━━━━━
     No. Pesanan : [ORDER_NUMBER]
     Tanggal     : [ORDER_DATE]
     Pelanggan   : [CUSTOMER_NAME] ([PHONE])
     Pengiriman  : [FULFILLMENT_DATE] [TIME]
     Alamat      : [DELIVERY_ADDRESS]

     📦 *DETAIL PESANAN*
     • [QTY]x [PRODUCT_NAME] - [PRICE]
       _[DETAILS]_

     ━━━━━━━━━━━━━━━━━━━
     Total       : [TOTAL]
     Sudah Bayar : [TOTAL_PAID]
     Sisa Tagihan: [BALANCE_DUE]
     Status Bayar: [PAYMENT_STATUS]
     ━━━━━━━━━━━━━━━━━━━
     🔍 *Lacak Status Pesanan Anda:*
     [TRACKING_URL]

     _Terima kasih atas pesanan Anda!_
     ```
   - Implementasikan `formatReceiptAsHtml(data)`: dokumen HTML bergaya thermal 80mm/A5 dengan CSS print (`@media print`), barcode/QR tracking placeholder, dan tombol cetak (`window.print()`).
2. Di `apps/api/src/modules/order/routes.ts`:
   - Tambahkan route:
     - `GET /:id/receipt`: return `{ data: receiptData, whatsappText }`.
     - `GET /:id/receipt/print`: return HTML stream/string dengan header `Content-Type: text/html; charset=utf-8`.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test apps/api/src/modules/order/receipt.test.ts`
Expected: PASS (2 tests pass).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/order/receipt.ts apps/api/src/modules/order/routes.ts apps/api/src/modules/order/receipt.test.ts
git commit -m "feat(api/order): add nota receipt generator for JSON, WhatsApp text, and print HTML"
```

---

### Task 7: Public Tracking Endpoint (FR-OCS-03, NFR-SEC-02)

**Files:**
- Modify: `apps/api/src/modules/tracking/routes.ts`
- Test: `apps/api/src/modules/tracking/tracking.test.ts`

**Interfaces:**
- Consumes: `customerOrder.trackingToken`
- Produces:
  - `GET /api/tracking/:token`: mengembalikan status pesanan publik `{ orderNumber, status, fulfillmentDate, fulfillmentTime, itemsSummary, statusHistory }` tanpa membocorkan info sensitif customer atau data order lain.

- [ ] **Step 1: Write the failing test**

```typescript
// apps/api/src/modules/tracking/tracking.test.ts
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { app } from "../../app";
import { dbReady, json } from "../../tests/helpers";
import { db } from "@bakery/database";
import { customer, customerOrder } from "@bakery/database/schema";

describe.skipIf(!dbReady)("Public Order Tracking (FR-OCS-03)", () => {
  let validToken: string;

  beforeAll(async () => {
    const [c] = await db.insert(customer).values({
      name: "Private Customer",
      phone: "081234567890",
      email: "secret@example.com",
    }).returning();

    const [ord] = await db.insert(customerOrder).values({
      customerId: c.id,
      orderNumber: "ORD-TRACK-TEST-1",
      sourceChannel: "whatsapp",
      status: "in_production",
      fulfillmentDate: "2026-10-25",
      fulfillmentTime: "10:00:00",
      total: "200000",
      subtotal: "200000",
    }).returning();

    validToken = ord.trackingToken;
  });

  test("GET /api/tracking/:token returns order status without auth and without leaking phone/email", async () => {
    const res = await app.request(`/api/tracking/${validToken}`);
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.data.orderNumber).toBe("ORD-TRACK-TEST-1");
    expect(body.data.status).toBe("in_production");
    expect(body.data.fulfillmentDate).toBe("2026-10-25");
    // Ensure sensitive customer details are NOT exposed
    expect(body.data.customerPhone).toBeUndefined();
    expect(body.data.customerEmail).toBeUndefined();
  });

  test("GET /api/tracking/:token returns 404 for unknown token", async () => {
    const res = await app.request("/api/tracking/ffffffffffffffffffffffff");
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test apps/api/src/modules/tracking/tracking.test.ts`
Expected: FAIL with HTTP 501.

- [ ] **Step 3: Implement public tracking route**

Di `apps/api/src/modules/tracking/routes.ts`:
- Query `customerOrder` berdasarkan `trackingToken`.
- Jika tidak ditemukan, lempar `notFound('Pesanan tidak ditemukan dengan token pelacakan ini')`.
- Join dengan `orderItem` dan `orderStatusHistory`.
- Return payload sanitasi:
  ```json
  {
    "data": {
      "orderNumber": "...",
      "status": "...",
      "fulfillmentDate": "...",
      "fulfillmentTime": "...",
      "items": [{ "productName": "...", "quantity": 1 }],
      "statusTimeline": [{ "status": "...", "timestamp": "..." }]
    }
  }
  ```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test apps/api/src/modules/tracking/tracking.test.ts`
Expected: PASS (2 tests pass).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/tracking/routes.ts apps/api/src/modules/tracking/tracking.test.ts
git commit -m "feat(api/tracking): implement public order tracking endpoint by token"
```

---

### Task 8: Web Frontend - Order Intake Form & Order Listing (`apps/web`)

**Files:**
- Create: `apps/web/src/app/orders/page.tsx`
- Create: `apps/web/src/app/orders/new/page.tsx`
- Create: `apps/web/src/components/orders/OrderForm.tsx`
- Create: `apps/web/src/components/orders/OrderListTable.tsx`
- Modify: `apps/web/src/app/layout.tsx`
- Test: `apps/web/src/components/orders/OrderForm.test.tsx` (atau e2e test dengan bun/node)

**Interfaces:**
- Consumes: API endpoints `GET /api/orders`, `POST /api/orders`, `GET /api/products`, `GET /api/customers`
- Produces:
  - UI Halaman Daftar Pesanan (`/orders`): tabel daftar pesanan dengan filter status, pencarian no order, tanggal fulfillment, dan tombol "+ Catat Order Baru".
  - UI Formulir Intake Pesanan (`/orders/new`): input info pelanggan (auto-lookup nama/telepon atau buat baru), channel asal (WhatsApp, IG, Walk-in), pilihan produk kue, ukuran, tingkat, dekorasi, catatan khusus, tanggal & jam pengiriman/pengambilan, kalkulasi total realtime, dan tombol "Simpan & Buat Nota".

- [ ] **Step 1: Write component specification / smoke test**

Buat unit/smoke test untuk validasi form state:
Pastikan form menolak submit jika tidak ada item kue yang dipilih, dan menghitung subtotal secara reaktif ketika quantity atau harga berubah.

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test apps/web/src/components/orders/OrderForm.test.tsx`
Expected: FAIL (file belum ada).

- [ ] **Step 3: Implement Order Intake Form & Order List components**

1. Buat `apps/web/src/components/orders/OrderForm.tsx`:
   - State untuk data customer: Nama, Nomor Telepon (WA), Email, Alamat Pengiriman.
   - Pilihan Sumber Channel: WhatsApp, Instagram, Walk-in, Telepon.
   - Dynamic Item List: Tombol tambah kue, pilih produk, input jumlah, pilihan dekorasi (fondant, buttercream, print, dsb), ukuran, dan catatan tulisan kue.
   - Realtime summary: Total estimasi harga.
   - Submit handler yang memanggil `POST /api/orders` dan meredirect ke `/orders/[id]` setelah berhasil.
2. Buat `apps/web/src/app/orders/new/page.tsx`:
   - Page container dengan header "Catat Orderan Baru" dan navigasi kembali.
3. Buat `apps/web/src/app/orders/page.tsx`:
   - Table view menampilkan daftar order dengan badge status (Received, In Production, Ready, Completed), nama customer, tanggal fulfillment, dan total bayar.

- [ ] **Step 4: Verify Next.js build & typecheck**

Run: `bun run typecheck`
Expected: PASS (0 type errors).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/orders apps/web/src/components/orders
git commit -m "feat(web/orders): create order intake form and order listing pages"
```

---

### Task 9: Web Frontend - Order Detail, Receipt (Nota) Modal, & WhatsApp Copy

**Files:**
- Create: `apps/web/src/app/orders/[id]/page.tsx`
- Create: `apps/web/src/components/orders/ReceiptModal.tsx`
- Create: `apps/web/src/components/orders/PaymentDialog.tsx`
- Test: `apps/web/src/components/orders/ReceiptModal.test.tsx`

**Interfaces:**
- Consumes: `GET /api/orders/:id`, `GET /api/orders/:id/receipt`, `POST /api/orders/:id/payments`
- Produces:
  - Halaman detail order `/orders/[id]`:
    - Rincian customer & status pesanan.
    - Tombol ganti status (misal "Konfirmasi", "Mulai Produksi", "Siap Diambil").
    - Tombol "Catat Pembayaran / DP".
    - Tombol "Lihat & Cetak Nota" -> membuka `ReceiptModal`.
    - Tombol "Salin Teks WhatsApp" -> langsung menyalin format pesan nota ke clipboard admin untuk dikirim ke chat customer.

- [ ] **Step 1: Write test for receipt modal & WhatsApp text copy**

Test bahwa fungsi copy to clipboard menerima teks nota yang valid dan tombol cetak mengarahkan ke print window.

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test apps/web/src/components/orders/ReceiptModal.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement Receipt Modal & WhatsApp Copy logic**

1. Buat `ReceiptModal.tsx`:
   - Menampilkan preview nota pesanan (header toko, no pesanan, list kue, total, status bayar/sisa tagihan, QR/link tracking).
   - Tombol **"Cetak Nota (Print / PDF)"**: memicu `window.print()` pada iframe atau membuka `/api/orders/:id/receipt/print` di tab baru.
   - Tombol **"Salin Format WhatsApp"**: menggunakan `navigator.clipboard.writeText(receipt.whatsappText)` dan menampilkan notifikasi "Teks nota berhasil disalin! Silakan paste ke chat WhatsApp pelanggan".
2. Buat `PaymentDialog.tsx`:
   - Modal input pembayaran: Nominal (misal DP 50% atau lunas), metode bayar (Transfer BCA, Mandiri, QRIS, Tunai).
3. Buat `apps/web/src/app/orders/[id]/page.tsx` mengintegrasikan seluruh komponen tersebut.

- [ ] **Step 4: Verify build & typecheck**

Run: `bun run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/orders/[id] apps/web/src/components/orders/ReceiptModal.tsx apps/web/src/components/orders/PaymentDialog.tsx
git commit -m "feat(web/orders): implement order detail page with nota modal and WhatsApp copy"
```

---

### Task 10: Web Frontend - Public Order Tracking Page

**Files:**
- Create: `apps/web/src/app/track/[token]/page.tsx`
- Create: `apps/web/src/components/tracking/TrackingTimeline.tsx`
- Test: `apps/web/src/app/track/[token]/page.test.tsx`

**Interfaces:**
- Consumes: API endpoint `GET /api/tracking/:token`
- Produces:
  - Customer-facing page publik di `/track/[token]`:
    - Responsive mobile-first view untuk customer yang mengklik link dari nota WhatsApp.
    - Menampilkan: Nomor pesanan, status saat ini dengan visual progress bar (Pesanan Diterima -> Dikonfirmasi -> Sedang Diproduksi -> Siap -> Selesai), estimasi waktu selesai/pengiriman, dan ringkasan kue yang dipesan.

- [ ] **Step 1: Write test for public tracking page**

Test rendering komponen timeline dengan berbagai variasi status (received, in_production, ready).

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test apps/web/src/app/track/[token]/page.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement Public Tracking Page & Timeline component**

1. Buat `apps/web/src/components/tracking/TrackingTimeline.tsx`:
   - Step indicator visual progres (Diterima, Dikonfirmasi, Produksi, Siap, Selesai).
2. Buat `apps/web/src/app/track/[token]/page.tsx`:
   - Mengambil data dari `/api/tracking/:token`.
   - Menampilkan card detail pesanan yang bersih, ramah pelanggan, dan tidak menampilkan data internal admin.

- [ ] **Step 4: Verify build & tests**

Run: `bun run test` dan `bun run build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/track apps/web/src/components/tracking
git commit -m "feat(web/tracking): create public order tracking page with visual status timeline"
```

---

### Task 11: End-to-End Verification & Traceability Validation (SRS Acceptance Criteria)

**Files:**
- Modify: `apps/api/src/tests/module-c-ocs.test.ts`
- Test: `apps/api/src/tests/module-c-ocs.test.ts`

**Interfaces:**
- Consumes: All order, receipt, payment, and tracking endpoints
- Produces:
  - Menghapus stub `.todo` pada `module-c-ocs.test.ts` dan menggantinya dengan test nyata yang memverifikasi acceptance criteria FR-OCS-01, FR-OCS-02, FR-OCS-03, FR-OCS-05, FR-OCS-06.

- [ ] **Step 1: Update `module-c-ocs.test.ts` with end-to-end assertions**

Gantikan `.todo` tests untuk:
- `FR-OCS-01`: intake order wajib source channel, semua order tampil dalam 1 list.
- `FR-OCS-02`: tiap perubahan status menambah baris riwayat.
- `FR-OCS-03`: link tracking publik dapat diakses tanpa login.
- `FR-OCS-05`: riwayat order pelanggan dapat diambil via nomor HP/email.
- `FR-OCS-06`: tier custom di bawah budget memicu review.

- [ ] **Step 2: Run all test suites across the monorepo**

Run: `bun run test`
Expected: PASS (seluruh test di `apps/api` lulus tanpa failure).

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/tests/module-c-ocs.test.ts
git commit -m "test(api/ocs): activate full SRS acceptance criteria verification for order management"
```
