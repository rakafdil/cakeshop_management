import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { app } from '../../app';
import { db } from '@bakery/database';
import { customer, customerOrder, orderStatusHistory, user } from '@bakery/database/schema';
import { eq, inArray } from 'drizzle-orm';
import {
  authHeaders,
  dbReady,
  errorOf,
  json,
  setupTestUsers,
  type AuthContext,
} from '../../tests/helpers';

describe.skipIf(!dbReady)('Order Status Lifecycle (FR-OCS-02)', () => {
  let ctx: AuthContext;
  let cleanupUsers: () => Promise<void>;
  let testCustomerId: string;
  let adminUserId: string;
  const createdOrderIds: string[] = [];

  beforeAll(async () => {
    const res = await setupTestUsers('order-status');
    ctx = res.adminCtx;
    cleanupUsers = res.cleanup;

    // Get admin user ID
    const [adminRow] = await db
      .select()
      .from(user)
      .where(eq(user.email, res.admin.email))
      .limit(1);
    adminUserId = adminRow.id;

    // Seed test customer
    const [c] = await db
      .insert(customer)
      .values({
        name: 'Rina Status Test',
        phone: `0812${Math.floor(10000000 + Math.random() * 90000000)}`,
        email: `rina-${Date.now().toString(36)}@test.local`,
      })
      .returning();
    testCustomerId = c.id;
  });

  afterAll(async () => {
    if (createdOrderIds.length > 0) {
      await db.delete(customerOrder).where(inArray(customerOrder.id, createdOrderIds));
    }
    if (testCustomerId) {
      await db.delete(customer).where(eq(customer.id, testCustomerId));
    }
    if (cleanupUsers) {
      await cleanupUsers();
    }
  });

  async function createTestOrder(status: any = 'received') {
    const suffix = Math.floor(1000 + Math.random() * 9000);
    const [ord] = await db
      .insert(customerOrder)
      .values({
        customerId: testCustomerId,
        orderNumber: `ORD-STAT-${Date.now().toString(36).toUpperCase()}-${suffix}`,
        sourceChannel: 'whatsapp',
        status,
        subtotal: '150000.00',
        total: '150000.00',
      })
      .returning();

    createdOrderIds.push(ord.id);

    // Initial status history entry
    await db.insert(orderStatusHistory).values({
      orderId: ord.id,
      oldStatus: null,
      newStatus: status,
      changedBy: adminUserId,
    });

    return ord;
  }

  describe('PATCH /api/orders/:id/status', () => {
    test('berhasil mengubah status dari received ke confirmed dan mencatat status history', async () => {
      const order = await createTestOrder('received');

      const res = await app.request(`/api/orders/${order.id}/status`, {
        method: 'PATCH',
        headers: authHeaders(ctx, { 'content-type': 'application/json' }),
        body: JSON.stringify({ status: 'confirmed' }),
      });

      expect(res.status).toBe(200);
      const body = (await json(res)) as { data: any };
      expect(body.data).toBeDefined();
      expect(body.data.id).toBe(order.id);
      expect(body.data.status).toBe('confirmed');

      // Verify status history
      const histRes = await app.request(`/api/orders/${order.id}/status-history`, {
        method: 'GET',
        headers: authHeaders(ctx),
      });

      expect(histRes.status).toBe(200);
      const histBody = (await json(histRes)) as { data: any[] };
      expect(histBody.data).toBeDefined();
      expect(histBody.data.length).toBeGreaterThanOrEqual(2);

      // Latest history entry should be confirmed
      const latest = histBody.data[0];
      expect(latest.orderId).toBe(order.id);
      expect(latest.oldStatus).toBe('received');
      expect(latest.newStatus).toBe('confirmed');
      expect(latest.changedBy).toBe(adminUserId);
      expect(latest.user).toBeDefined();
      expect(latest.user.email).toBe(ctx.user.email);
    });

    test('mengembalikan 400 jika transisi dari requires_review langsung ke in_production', async () => {
      const order = await createTestOrder('requires_review');

      const res = await app.request(`/api/orders/${order.id}/status`, {
        method: 'PATCH',
        headers: authHeaders(ctx, { 'content-type': 'application/json' }),
        body: JSON.stringify({ status: 'in_production' }),
      });

      expect(res.status).toBe(400);
      const err = await errorOf(res);
      expect(err.message).toContain('Order requires review approval before production');
    });

    test('mengembalikan 404 jika order id tidak ditemukan', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const res = await app.request(`/api/orders/${nonExistentId}/status`, {
        method: 'PATCH',
        headers: authHeaders(ctx, { 'content-type': 'application/json' }),
        body: JSON.stringify({ status: 'confirmed' }),
      });

      expect(res.status).toBe(404);
      const err = await errorOf(res);
      expect(err.code).toBe('NOT_FOUND');
    });

    test('mengembalikan 400 jika status tidak valid', async () => {
      const order = await createTestOrder('received');

      const res = await app.request(`/api/orders/${order.id}/status`, {
        method: 'PATCH',
        headers: authHeaders(ctx, { 'content-type': 'application/json' }),
        body: JSON.stringify({ status: 'non_existent_status' }),
      });

      expect(res.status).toBe(400);
      const err = await errorOf(res);
      expect(err).toBeDefined();
    });
  });

  describe('GET /api/orders/:id/status-history', () => {
    test('mengembalikan 404 jika order id tidak ditemukan', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const res = await app.request(`/api/orders/${nonExistentId}/status-history`, {
        method: 'GET',
        headers: authHeaders(ctx),
      });

      expect(res.status).toBe(404);
      const err = await errorOf(res);
      expect(err.code).toBe('NOT_FOUND');
    });
  });
});
