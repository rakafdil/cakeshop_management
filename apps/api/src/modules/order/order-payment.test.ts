import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { app } from "../../app";
import { authHeaders, dbReady, json, setupTestUsers } from "../../tests/helpers";
import { db } from "@bakery/database";
import { customer, customerOrder } from "@bakery/database/schema";

describe.skipIf(!dbReady)("Order Payment & DP Recording", () => {
	let ctx: any;
	let cleanupUsers: () => Promise<void>;
	let testOrderId: string;
	let testCustomerId: string;

	beforeAll(async () => {
		const res = await setupTestUsers("order-pay");
		ctx = res.adminCtx;
		cleanupUsers = res.cleanup;

		const [c] = await db
			.insert(customer)
			.values({ name: "Agus", phone: "081334455987" })
			.returning();
		testCustomerId = c.id;

		const [ord] = await db
			.insert(customerOrder)
			.values({
				customerId: c.id,
				orderNumber: `ORD-PAY-TEST-${Date.now()}`,
				sourceChannel: "walk_in",
				status: "received",
				total: "500000",
				subtotal: "500000",
			})
			.returning();
		testOrderId = ord.id;
	});

	afterAll(async () => {
		if (cleanupUsers) await cleanupUsers();
	});

	test("POST /api/orders/:id/payments records down payment and returns 201", async () => {
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
		expect(body.data).toBeDefined();
		expect((body.data as any).amount).toBe("250000.00");
		expect((body.data as any).status).toBe("verified");
		expect((body.data as any).orderId).toBe(testOrderId);
	});

	test("GET /api/orders/:id/payments returns list and balance summary", async () => {
		const summaryRes = await app.request(`/api/orders/${testOrderId}/payments`, {
			method: "GET",
			headers: authHeaders(ctx),
		});
		expect(summaryRes.status).toBe(200);
		const summaryBody = await json(summaryRes);
		expect(summaryBody.summary).toBeDefined();
		const summary = summaryBody.summary as any;
		expect(summary.totalOrder).toBe(500000);
		expect(summary.totalPaid).toBe(250000);
		expect(summary.balanceDue).toBe(250000);
		expect(Array.isArray(summaryBody.data)).toBe(true);
		expect((summaryBody.data as any[]).length).toBeGreaterThanOrEqual(1);
	});

	test("POST /api/orders/:id/payments with non-existent orderId returns 404", async () => {
		const res = await app.request(
			"/api/orders/00000000-0000-0000-0000-000000000000/payments",
			{
				method: "POST",
				headers: authHeaders(ctx, { "content-type": "application/json" }),
				body: JSON.stringify({
					amount: 100000,
					paymentMethod: "cash",
				}),
			},
		);
		expect(res.status).toBe(404);
	});

	test("POST /api/orders/:id/payments with invalid amount returns 400", async () => {
		const res = await app.request(`/api/orders/${testOrderId}/payments`, {
			method: "POST",
			headers: authHeaders(ctx, { "content-type": "application/json" }),
			body: JSON.stringify({
				amount: -100,
				paymentMethod: "cash",
			}),
		});
		expect(res.status).toBe(400);
	});
});
