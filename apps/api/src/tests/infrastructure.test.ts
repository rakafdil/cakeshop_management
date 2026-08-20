import { describe, expect, test } from "bun:test";
import { app } from "../app";
import { env } from "../config/env";
import { type ApiErrorBody, errorOf, json } from "./helpers";

// ==================================================================================
// Infrastruktur & Keamanan Dasar (tanpa DB)
//
// Meliputi:
// - Health check & format error envelope
// - CORS & Origin whitelist
// - CSRF double-submit protection
// - Rate limiting per IP
// - Validasi request body/params (Zod)
// - Routing map: NFR-SEC-01 (proteksi 401 bagi rute terproteksi tanpa login)
// - NFR-SEC-02: Entropi tracking token (>= 128 bit) & registrasi endpoint tracking
// ==================================================================================

describe("Infrastruktur: health & error envelope", () => {
	test("GET /api/health -> 200 ok", async () => {
		const res = await app.request("/api/health");
		expect(res.status).toBe(200);
		const body = await json(res);
		expect(body.status).toBe("ok");
		expect(body.service).toBe("cakeshop-api");
	});

	test("route tak dikenal -> 404 { error }", async () => {
		const res = await app.request("/api/endpoint-tidak-ada");
		expect(res.status).toBe(404);
		const body = await json(res);
		expect((body.error as ApiErrorBody).code).toBe("NOT_FOUND");
		expect(typeof (body.error as ApiErrorBody).message).toBe("string");
	});

	test("semua error berbentuk { error: { code, message } }", async () => {
		for (const path of ["/api/nope", "/api/tracking/ab", "/api/health"]) {
			const res = await app.request(path);
			const body = await json(res);
			if (res.status === 200) continue;
			expect(body.error).toBeDefined();
			expect(typeof (body.error as ApiErrorBody).code).toBe("string");
			expect(typeof (body.error as ApiErrorBody).message).toBe("string");
		}
	});
});

describe("Infrastruktur: CORS", () => {
	test("preflight OPTIONS mengembalikan header CORS + credentials", async () => {
		const res = await app.request("/api/health", {
			method: "OPTIONS",
			headers: {
				origin: "http://localhost:3000",
				"access-control-request-method": "GET",
			},
		});
		expect(res.headers.get("access-control-allow-origin")).toBe(
			"http://localhost:3000",
		);
		expect(res.headers.get("access-control-allow-credentials")).toBe("true");
		expect(
			res.headers.get("access-control-allow-headers")?.toLowerCase(),
		).toContain("x-csrf-token");
	});

	test("origin tidak dikenal tidak diberi allow-origin", async () => {
		const res = await app.request("/api/health", {
			headers: { origin: "https://evil.example.com" },
		});
		expect(res.headers.get("access-control-allow-origin")).not.toBe(
			"https://evil.example.com",
		);
	});
});

describe("Infrastruktur: CSRF double-submit (NFR-SEC)", () => {
	test("POST tanpa token CSRF -> 403 CSRF_FAILED", async () => {
		const res = await app.request("/api/health", { method: "POST" });
		expect(res.status).toBe(403);
		expect((await errorOf(res)).code).toBe("CSRF_FAILED");
	});

	test("POST dengan cookie+header CSRF yang cocok -> lolos CSRF (404 karena method tidak ada)", async () => {
		const res = await app.request("/api/health", {
			method: "POST",
			headers: { cookie: "ck_csrf=abc123", "x-csrf-token": "abc123" },
		});
		expect(res.status).toBe(404);
	});

	test("GET tidak wajib token CSRF", async () => {
		expect((await app.request("/api/health")).status).toBe(200);
	});
});

describe("Infrastruktur: rate limit (per IP)", () => {
	test(`lebih dari RATE_LIMIT_MAX request per IP -> 429`, async () => {
		const ip = "10.99.0.1";
		for (let i = 0; i < env.RATE_LIMIT_MAX; i++) {
			await app.request("/api/health", { headers: { "x-forwarded-for": ip } });
		}
		const res = await app.request("/api/health", {
			headers: { "x-forwarded-for": ip },
		});
		expect(res.status).toBe(429);
		expect((await errorOf(res)).code).toBe("RATE_LIMITED");
	});
});

describe("Infrastruktur: validasi (zod)", () => {
	test("tracking token terlalu pendek -> 400 VALIDATION_ERROR", async () => {
		const res = await app.request("/api/tracking/ab");
		expect(res.status).toBe(400);
		expect((await errorOf(res)).code).toBe("VALIDATION_ERROR");
	});

	test("login dengan email tidak valid -> 400 VALIDATION_ERROR (sebelum cek DB)", async () => {
		const res = await app.request("/api/auth/login", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ email: "bukan-email" }),
		});
		expect(res.status).toBe(400);
		expect((await errorOf(res)).code).toBe("VALIDATION_ERROR");
	});
});

describe("Routing map (NFR-SEC-01: akses tanpa login ditolak)", () => {
	const protectedRoutes = [
		"/api/users",
		"/api/customers",
		"/api/products",
		"/api/product-categories",
		"/api/recipes",
		"/api/ingredients",
		"/api/uoms",
		"/api/tools",
		"/api/labor-rates",
		"/api/production",
		"/api/production-slots",
		"/api/stock-transactions",
		"/api/stock-alerts",
		"/api/orders",
		"/api/payments",
		"/api/financial-transactions",
		"/api/product-costs",
		"/api/pricing-rules",
		"/api/product-prices",
		"/api/sales-forecasts",
		"/api/content",
		"/api/value-propositions",
		"/api/portfolio",
		"/api/dashboard/summary",
	];

	for (const path of protectedRoutes) {
		test(`GET ${path} tanpa login -> 401 UNAUTHORIZED`, async () => {
			expect((await app.request(path)).status).toBe(401);
		});
	}
});

describe("NFR-SEC-02: entropy tracking token (FR-OCS-03)", () => {
	test("schema default menggunakan gen_random_bytes(24) (192 bit >= 128 bit)", async () => {
		const { customerOrder } = await import("@bakery/database/schema");
		const d = customerOrder.trackingToken.default;
		if (!d || typeof d === "string") {
			throw new Error("tracking token default bukan SQL expression");
		}
		expect(JSON.stringify(d.queryChunks)).toContain("gen_random_bytes(24)");
	});

	test("GET /api/tracking/:token publik (tanpa login) dan ter-registrasi -> 501", async () => {
		const res = await app.request("/api/tracking/abcdef123456");
		expect(res.status).toBe(501);
		expect((await errorOf(res)).code).toBe("NOT_IMPLEMENTED");
	});
});
