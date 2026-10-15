import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { app } from '../../app';
import { db } from '@bakery/database';
import {
  customer,
  customerOrder,
  orderItem,
  orderReview,
  orderStatusHistory,
  product,
  uom,
} from '@bakery/database/schema';
import { eq, inArray } from 'drizzle-orm';
import {
  authHeaders,
  dbReady,
  json,
  setupTestUsers,
  type AuthContext,
} from '../../tests/helpers';

describe.skipIf(!dbReady)('Order Intake & Customer Resolution (Task 3)', () => {
  let ctx: AuthContext;
  let cleanupUsers: () => Promise<void>;
  let testProductId: string;
  let testUomId: string;
  const createdOrderIds: string[] = [];
  const createdCustomerIds: string[] = [];

  beforeAll(async () => {
    const res = await setupTestUsers('order-intake');
    ctx = res.adminCtx;
    cleanupUsers = res.cleanup;

    // Seed test UOM
    const [uomRow] = await db
      .insert(uom)
      .values({
        name: 'Pieces Test',
        symbol: `pc-${Date.now().toString(36).slice(2, 6)}`,
        type: 'unit',
      })
      .returning();
    testUomId = uomRow.id;

    // Seed test Product
    const [prodRow] = await db
      .insert(product)
      .values({
        name: 'Intake Test Cake',
        productionType: 'unit',
        marketSegment: 'everyday_budget',
        basePrice: '200000.00',
      })
      .returning();
    testProductId = prodRow.id;
  });

  afterAll(async () => {
    // Cleanup orders & related records cascade
    if (createdOrderIds.length > 0) {
      await db.delete(customerOrder).where(inArray(customerOrder.id, createdOrderIds));
    }
    // Cleanup created customers
    if (createdCustomerIds.length > 0) {
      await db.delete(customer).where(inArray(customer.id, createdCustomerIds));
    }
    // Cleanup seed product & uom
    if (testProductId) {
      await db.delete(product).where(eq(product.id, testProductId));
    }
    if (testUomId) {
      await db.delete(uom).where(eq(uom.id, testUomId));
    }
    if (cleanupUsers) {
      await cleanupUsers();
    }
  });

  describe('POST /api/orders', () => {
    test('membuat customer baru jika belum ada dan menghasilkan order dengan status received', async () => {
      const uniqueSuffix = Date.now().toString(36);
      const phone = `0812${Math.floor(10000000 + Math.random() * 90000000)}`;
      const payload = {
        customer: {
          name: `Customer Baru ${uniqueSuffix}`,
          phone,
          email: `cust-${uniqueSuffix}@test.local`,
          address: 'Jl. Merdeka No. 123',
        },
        sourceChannel: 'whatsapp',
        fulfillmentDate: '2026-11-01',
        fulfillmentTime: '14:00',
        deliveryAddress: 'Jl. Merdeka No. 123',
        items: [
          {
            productId: testProductId,
            quantity: 2,
            uomId: testUomId,
            unitPrice: 200000,
            decorationType: 'none' as const,
            statedBudget: 450000,
            customization: 'Tulis Selamat Ulang Tahun',
          },
        ],
      };

      const res = await app.request('/api/orders', {
        method: 'POST',
        headers: authHeaders(ctx, { 'content-type': 'application/json' }),
        body: JSON.stringify(payload),
      });

      expect(res.status).toBe(201);
      const body = (await json(res)) as { data: any };
      const orderData = body.data;

      expect(orderData).toBeDefined();
      expect(orderData.id).toBeDefined();
      createdOrderIds.push(orderData.id);
      if (orderData.customerId) {
        createdCustomerIds.push(orderData.customerId);
      }

      // Menghasilkan orderNumber dengan prefix ORD-
      expect(orderData.orderNumber).toMatch(/^ORD-\d{8}-[A-F0-9]{4}$/);

      // Status received karena budget (450000) >= total estimasi (400000)
      expect(orderData.status).toBe('received');
      expect(Number(orderData.subtotal)).toBe(400000);
      expect(Number(orderData.total)).toBe(400000);

      // Customer resolusi
      expect(orderData.customer).toBeDefined();
      expect(orderData.customer.name).toBe(payload.customer.name);
      expect(orderData.customer.phone).toBe(phone);

      // Menyimpan items
      expect(orderData.items).toHaveLength(1);
      expect(orderData.items[0].productId).toBe(testProductId);
      expect(Number(orderData.items[0].unitPrice)).toBe(200000);
      expect(Number(orderData.items[0].quantity)).toBe(2);
      expect(Number(orderData.items[0].subtotal)).toBe(400000);

      // Verifikasi status history dicatat di DB
      const history = await db
        .select()
        .from(orderStatusHistory)
        .where(eq(orderStatusHistory.orderId, orderData.id));
      expect(history.length).toBeGreaterThanOrEqual(1);
      expect(history[0].newStatus).toBe('received');
      expect(history[0].oldStatus).toBeNull();
    });

    test('menggunakan customer yang sudah ada (matching phone) dan update address', async () => {
      const phone = `0813${Math.floor(10000000 + Math.random() * 90000000)}`;
      // Insert customer awal
      const [existingCust] = await db
        .insert(customer)
        .values({
          name: 'Pelanggan Lama',
          phone,
          email: 'lama@test.local',
          address: 'Alamat Lama',
        })
        .returning();
      createdCustomerIds.push(existingCust.id);

      const payload = {
        customer: {
          name: 'Pelanggan Lama',
          phone,
          address: 'Alamat Baru Jalan Mawar 45',
        },
        sourceChannel: 'instagram',
        items: [
          {
            productId: testProductId,
            quantity: 1,
            uomId: testUomId,
            unitPrice: 200000,
            decorationType: 'buttercream' as const,
          },
        ],
      };

      const res = await app.request('/api/orders', {
        method: 'POST',
        headers: authHeaders(ctx, { 'content-type': 'application/json' }),
        body: JSON.stringify(payload),
      });

      expect(res.status).toBe(201);
      const body = (await json(res)) as { data: any };
      const orderData = body.data;
      createdOrderIds.push(orderData.id);

      // Harus menggunakan customer yang sama
      expect(orderData.customerId).toBe(existingCust.id);

      // Address customer diperbarui
      const [updatedCust] = await db
        .select()
        .from(customer)
        .where(eq(customer.id, existingCust.id));
      expect(updatedCust.address).toBe('Alamat Baru Jalan Mawar 45');
    });

    test('status requires_review dan membuat orderReview jika screening rule terpicu (budget < harga)', async () => {
      const phone = `0814${Math.floor(10000000 + Math.random() * 90000000)}`;
      const payload = {
        customer: {
          name: 'Customer Budget Rendah',
          phone,
        },
        sourceChannel: 'walk_in',
        items: [
          {
            productId: testProductId,
            quantity: 1,
            uomId: testUomId,
            unitPrice: 350000,
            statedBudget: 150000, // Budget 150k < harga 350k -> trigger review
            decorationType: 'fondant' as const,
          },
        ],
      };

      const res = await app.request('/api/orders', {
        method: 'POST',
        headers: authHeaders(ctx, { 'content-type': 'application/json' }),
        body: JSON.stringify(payload),
      });

      expect(res.status).toBe(201);
      const body = (await json(res)) as { data: any };
      const orderData = body.data;
      createdOrderIds.push(orderData.id);
      if (orderData.customerId) {
        createdCustomerIds.push(orderData.customerId);
      }

      // Status awal adalah requires_review
      expect(orderData.status).toBe('requires_review');

      // Verifikasi orderReview dibuat di DB
      const reviews = await db
        .select()
        .from(orderReview)
        .where(eq(orderReview.orderId, orderData.id));
      expect(reviews.length).toBe(1);
      expect(reviews[0].status).toBe('pending');
      expect(reviews[0].reason).toContain('budget stated (150000) is below unit price (350000)');

      // Verifikasi status history awal dicatat
      const history = await db
        .select()
        .from(orderStatusHistory)
        .where(eq(orderStatusHistory.orderId, orderData.id));
      expect(history[0].newStatus).toBe('requires_review');
    });
  });

  describe('GET /api/orders', () => {
    test('mengembalikan daftar pesanan dengan pagination', async () => {
      const res = await app.request('/api/orders?page=1&pageSize=5', {
        method: 'GET',
        headers: authHeaders(ctx),
      });

      expect(res.status).toBe(200);
      const body = (await json(res)) as {
        data: any[];
        pagination: { page: number; limit: number; total: number };
      };

      expect(Array.isArray(body.data)).toBe(true);
      expect(body.pagination).toBeDefined();
      expect(body.pagination.page).toBe(1);
      expect(body.pagination.limit).toBe(5);
      expect(typeof body.pagination.total).toBe('number');
      expect(body.pagination.total).toBeGreaterThanOrEqual(1);

      // Verifikasi item order dalam list memiliki properti penting
      const first = body.data[0];
      expect(first.id).toBeDefined();
      expect(first.orderNumber).toBeDefined();
      expect(first.status).toBeDefined();
    });
  });

  describe('GET /api/orders/:id', () => {
    test('mengembalikan detail pesanan lengkap beserta customer dan items', async () => {
      // Ambil salah satu order yang baru dibuat
      const targetOrderId = createdOrderIds[0];
      expect(targetOrderId).toBeDefined();

      const res = await app.request(`/api/orders/${targetOrderId}`, {
        method: 'GET',
        headers: authHeaders(ctx),
      });

      expect(res.status).toBe(200);
      const body = (await json(res)) as { data: any };
      const order = body.data;

      expect(order.id).toBe(targetOrderId);
      expect(order.orderNumber).toBeDefined();
      expect(order.customer).toBeDefined();
      expect(order.customer.id).toBe(order.customerId);
      expect(Array.isArray(order.items)).toBe(true);
      expect(order.items.length).toBeGreaterThan(0);
      expect(order.items[0].product).toBeDefined();
    });

    test('mengembalikan 404 NOT_FOUND jika ID tidak ditemukan', async () => {
      const res = await app.request(
        '/api/orders/ffffffff-ffff-ffff-ffff-ffffffffffff',
        {
          method: 'GET',
          headers: authHeaders(ctx),
        },
      );

      expect(res.status).toBe(404);
    });
  });
});
