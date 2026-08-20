import { afterAll, beforeAll, describe, test } from "bun:test";
import {
	type AuthContext,
	dbReady,
	expectStub,
	setupTestUsers,
} from "./helpers";

// ==================================================================================
// Modul D — Marketing & Value Communication (MVC)
// Berdasarkan docs/srs.md (FR-MVC-01 s/d FR-MVC-05)
// ==================================================================================

describe.skipIf(!dbReady)(
	"Modul D — Marketing & Value Communication (MVC)",
	() => {
		let ctx: AuthContext;
		let cleanupUsers: () => Promise<void>;

		beforeAll(async () => {
			const res = await setupTestUsers("mvc");
			ctx = res.adminCtx;
			cleanupUsers = res.cleanup;
		});

		afterAll(async () => {
			if (cleanupUsers) await cleanupUsers();
		});

		describe("FR-MVC-01 (kalender konten)", () => {
			test("GET/POST /api/content ter-registrasi -> 501", async () => {
				await expectStub(ctx, "GET", "/api/content");
				await expectStub(ctx, "POST", "/api/content");
			});
			test.todo('AC: item terjadwal muncul di view "Due Today" dashboard', () => {});
		});

		describe("FR-MVC-02 (library template value proposition)", () => {
			test("GET/POST /api/value-propositions ter-registrasi -> 501", async () => {
				await expectStub(ctx, "GET", "/api/value-propositions");
				await expectStub(ctx, "POST", "/api/value-propositions");
			});
			test.todo("AC: template yang terpasang pada produk dirender di halaman customer-facing", () => {});
		});

		describe("FR-MVC-03 (tag segment pasar)", () => {
			test("GET /api/products ter-registrasi -> 501", async () => {
				await expectStub(ctx, "GET", "/api/products");
			});
			test.todo("AC: filter segment menampilkan hanya produk dengan tag tersebut", () => {});
		});

		describe("FR-MVC-04 (value proposition otomatis pada konfirmasi)", () => {
			test.todo("AC: order produk tag Premium/Artisan yang dikonfirmasi menyertakan teks VP terkait", () => {});
		});

		describe("FR-MVC-05 (portofolio)", () => {
			test("GET /api/portfolio ter-registrasi -> 501", async () => {
				await expectStub(ctx, "GET", "/api/portfolio");
			});
			test.todo("AC: filter kategori menampilkan entri portofolio sesuai, urut tanggal menurun", () => {});
		});
	},
);
