import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { app } from "../app";
import {
	type AuthContext,
	authHeaders,
	dbReady,
	errorOf,
	expectStub,
	login,
	loginBody,
	setupTestUsers,
	userOf,
} from "./helpers";

// ==================================================================================
// Non-Functional Requirements: Security & Authentication (dengan DB)
//
// Meliputi:
// - NFR-SEC-04: Autentikasi, JWT cookie httpOnly, session revocation di DB saat logout
// - NFR-SEC-01: Role-Based Access Control (Admin vs Temporary Staff)
// - CSRF verification pada request ter-authentikasi
// ==================================================================================

describe.skipIf(!dbReady)("NFR: Security & Authentication (PostgreSQL)", () => {
	let admin: { email: string; password: string; name: string; role: "admin" };
	let ctx: AuthContext;
	let staffCtx: AuthContext;
	let cleanupUsers: () => Promise<void>;

	beforeAll(async () => {
		const res = await setupTestUsers("nfr-sec");
		admin = res.admin;
		ctx = res.adminCtx;
		staffCtx = res.staffCtx;
		cleanupUsers = res.cleanup;
	});

	afterAll(async () => {
		if (cleanupUsers) await cleanupUsers();
	});

	// --- NFR-SEC-04: autentikasi & session cookie ---

	describe("NFR-SEC-04: autentikasi", () => {
		test("login password salah -> 401 INVALID_CREDENTIALS", async () => {
			const res = await app.request(
				"/api/auth/login",
				loginBody(admin.email, "salah-salah"),
			);
			expect(res.status).toBe(401);
			expect((await errorOf(res)).code).toBe("INVALID_CREDENTIALS");
		});

		test("login benar -> 200 + cookie httpOnly + csrf token", async () => {
			const { res, body, token, csrf, user } = await login(
				admin.email,
				admin.password,
			);
			expect(res.status).toBe(200);
			expect(token).toBeTruthy();
			expect(csrf).toBeTruthy();
			expect(user.email).toBe(admin.email);
			expect(body.csrfToken).toBe(csrf);
		});

		test("cookie sesi berflag HttpOnly dan SameSite=Lax", async () => {
			const { res } = await login(admin.email, admin.password);
			const sc = res.headers.getSetCookie().join("; ");
			const tokenCookie = res.headers
				.getSetCookie()
				.find((c) => c.startsWith("ck_token="));
			expect(tokenCookie).toBeTruthy();
			expect(tokenCookie?.toLowerCase()).toContain("httponly");
			expect(sc.toLowerCase()).toContain("samesite=lax");
			// CSRF cookie harus dapat dibaca JS (double-submit) -> tidak httpOnly
			const csrfCookie = res.headers
				.getSetCookie()
				.find((c) => c.startsWith("ck_csrf="));
			expect(csrfCookie?.toLowerCase()).not.toContain("httponly");
		});

		test("GET /api/auth/me dengan cookie -> data user", async () => {
			const { token } = await login(admin.email, admin.password);
			const res = await app.request("/api/auth/me", {
				headers: { cookie: `ck_token=${token}` },
			});
			expect(res.status).toBe(200);
			expect((await userOf(res)).email).toBe(admin.email);
		});

		test("logout mencabut sesi di server -> token lama ditolak (401)", async () => {
			const { token } = await login(admin.email, admin.password);
			const res = await app.request("/api/auth/logout", {
				method: "POST",
				headers: { cookie: `ck_token=${token}` },
			});
			expect(res.status).toBe(200);
			const me = await app.request("/api/auth/me", {
				headers: { cookie: `ck_token=${token}` },
			});
			expect(me.status).toBe(401);
		});

		test.todo("NFR-SEC-04: session timeout 30 menit tanpa aktivitas (saat ini JWT_EXPIRES_IN_DAYS)", () => {});
	});

	// --- NFR-SEC-01: RBAC ---

	describe("NFR-SEC-01: role-based access control", () => {
		test("staff ditolak di modul admin -> 403 FORBIDDEN", async () => {
			for (const path of [
				"/api/users",
				"/api/financial-transactions",
				"/api/dashboard/summary",
			]) {
				const res = await app.request(path, {
					headers: { cookie: `ck_token=${staffCtx.token}` },
				});
				expect(res.status, path).toBe(403);
				expect((await errorOf(res)).code).toBe("FORBIDDEN");
			}
		});

		test("admin dapat mengakses modul admin (stub -> 501)", async () => {
			const res = await app.request("/api/users", {
				headers: authHeaders(ctx),
			});
			expect(res.status).toBe(501);
		});

		test("staff dapat mengakses modul yang boleh diakses (stub -> 501)", async () => {
			const res = await app.request("/api/recipes", {
				headers: authHeaders(staffCtx),
			});
			expect(res.status).toBe(501);
		});

		test("login staff -> role staff di /me", async () => {
			const res = await app.request("/api/auth/me", {
				headers: { cookie: `ck_token=${staffCtx.token}` },
			});
			expect((await userOf(res)).role).toBe("staff");
		});
	});

	// --- CSRF ter-authentikasi ---

	describe("CSRF pada request ter-authentikasi", () => {
		test("POST tanpa header CSRF -> 403; dengan header benar -> lolos (stub 501)", async () => {
			const noCsrf = await app.request("/api/customers", {
				method: "POST",
				headers: { cookie: `ck_token=${ctx.token}` },
				body: "{}",
			});
			expect(noCsrf.status).toBe(403);

			await expectStub(ctx, "POST", "/api/customers");
		});
	});
});
