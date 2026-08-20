import { expect } from "bun:test";
import { connect } from "node:net";
import { db } from "@bakery/database";
import { user } from "@bakery/database/schema";
import bcrypt from "bcryptjs";
import { inArray } from "drizzle-orm";
import { app } from "../app";
import { env } from "../config/env";

// --- deteksi ketersediaan DB (TCP probe singkat) ---

export function parseDbUrl(url: string) {
	const u = new URL(url);
	return { host: u.hostname, port: Number(u.port || 5432) };
}

export function isPortOpen(
	host: string,
	port: number,
	timeoutMs = 1500,
): Promise<boolean> {
	return new Promise((resolve) => {
		const sock = connect({ host, port, timeout: timeoutMs });
		sock.once("connect", () => {
			sock.destroy();
			resolve(true);
		});
		sock.once("error", () => resolve(false));
		sock.once("timeout", () => {
			sock.destroy();
			resolve(false);
		});
	});
}

const dbUrl = parseDbUrl(env.DATABASE_URL);
export const dbReady = await isPortOpen(dbUrl.host, dbUrl.port);

// --- helpers respons & error ---

export async function json(res: Response) {
	return (await res.json()) as Record<string, unknown>;
}

export interface ApiErrorBody {
	code: string;
	message: string;
}

export async function errorOf(res: Response): Promise<ApiErrorBody> {
	const body = await json(res);
	return (body.error ?? {}) as ApiErrorBody;
}

export async function userOf(
	res: Response,
): Promise<{ email?: string; role?: string }> {
	const body = await json(res);
	return (body.user ?? {}) as { email?: string; role?: string };
}

export function getCookie(res: Response, name: string): string | null {
	const setCookies = res.headers.getSetCookie();
	for (const sc of setCookies) {
		const [pair] = sc.split(";");
		const [k, v] = pair.split("=");
		if (k?.trim() === name) return v?.trim() ?? null;
	}
	return null;
}

// IP unik per login agar tidak terkena auth rate-limit antar-test.
let ipCounter = 0;
export function nextIp(): string {
	ipCounter += 1;
	return `10.0.${Math.floor(ipCounter / 250)}.${(ipCounter % 250) + 1}`;
}

export function loginBody(email: string, password: string) {
	return {
		method: "POST",
		headers: {
			"content-type": "application/json",
			"x-forwarded-for": nextIp(),
		},
		body: JSON.stringify({ email, password }),
	};
}

export interface AuthContext {
	res: Response;
	body: Record<string, unknown>;
	token: string;
	csrf: string;
	user: { email?: string; role?: string };
}

export async function login(
	email: string,
	password: string,
): Promise<AuthContext> {
	const res = await app.request("/api/auth/login", loginBody(email, password));
	const body = await json(res);
	const token = getCookie(res, "ck_token");
	if (!token) throw new Error(`login gagal (HTTP ${res.status})`);
	return {
		res,
		body,
		token,
		csrf: getCookie(res, "ck_csrf") ?? "",
		user: (body.user ?? {}) as { email?: string; role?: string },
	};
}

// Header request ter-authentikasi + CSRF double-submit.
export function authHeaders(
	ctx: { token: string; csrf: string },
	extra: Record<string, string> = {},
) {
	return {
		cookie: `ck_token=${ctx.token}; ck_csrf=${ctx.csrf}`,
		"x-csrf-token": ctx.csrf,
		...extra,
	};
}

export async function expectStub(
	ctx: { token: string; csrf: string },
	method: string,
	path: string,
) {
	const res = await app.request(path, { method, headers: authHeaders(ctx) });
	expect(res.status).toBe(501);
	expect((await errorOf(res)).code).toBe("NOT_IMPLEMENTED");
}

// Helper untuk setup & cleanup user admin/staff per test suite
export async function setupTestUsers(prefix = "test") {
	const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
	const admin = {
		email: `${prefix}-admin-${uniqueId}@cakeshop.local`,
		password: "TestPass1234",
		name: "Test Admin",
		role: "admin" as const,
	};
	const staff = {
		email: `${prefix}-staff-${uniqueId}@cakeshop.local`,
		password: "TestPass1234",
		name: "Test Staff",
		role: "staff" as const,
	};

	const hash = await bcrypt.hash(admin.password, 4);
	await db.insert(user).values([
		{
			name: admin.name,
			email: admin.email,
			passwordHash: hash,
			role: admin.role,
		},
		{
			name: staff.name,
			email: staff.email,
			passwordHash: hash,
			role: staff.role,
		},
	]);

	const adminCtx = await login(admin.email, admin.password);
	const staffCtx = await login(staff.email, staff.password);

	const cleanup = async () => {
		await db
			.delete(user)
			.where(inArray(user.email, [admin.email, staff.email]));
	};

	return { admin, staff, adminCtx, staffCtx, cleanup };
}
