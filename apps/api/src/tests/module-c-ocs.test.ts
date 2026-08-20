import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { app } from "../app";
import {
	type AuthContext,
	dbReady,
	expectStub,
	setupTestUsers,
} from "./helpers";

// ==================================================================================
// Modul C — Order Management & Customer Screening (OCS)
// Berdasarkan docs/srs.md (FR-OCS-01 s/d FR-OCS-10)
// ==================================================================================

describe.skipIf(!dbReady)(
	"Modul C — Order Management & Customer Screening (OCS)",
	() => {
		let ctx: AuthContext;
		let cleanupUsers: () => Promise<void>;

		beforeAll(async () => {
			const res = await setupTestUsers("ocs");
			ctx = res.adminCtx;
			cleanupUsers = res.cleanup;
		});

		afterAll(async () => {
			if (cleanupUsers) await cleanupUsers();
		});

		describe("FR-OCS-01 (intake order terpusat)", () => {
			test("GET/POST /api/orders ter-registrasi -> 501", async () => {
				await expectStub(ctx, "GET", "/api/orders");
				await expectStub(ctx, "POST", "/api/orders");
			});
			test.todo("AC: field source channel wajib; semua order tampil dalam satu daftar", () => {});
		});

		describe("FR-OCS-02 (status order + log timestamp)", () => {
			test("GET /api/orders/:id/status-history ter-registrasi -> 501", async () => {
				await expectStub(
					ctx,
					"GET",
					"/api/orders/00000000-0000-0000-0000-000000000000/status-history",
				);
			});
			test.todo("AC: tiap perubahan status menambah entry (old, new, timestamp)", () => {});
		});

		describe("FR-OCS-03 (link tracking publik)", () => {
			test("tracking token tak dikenal -> data tidak bocor (harus 404, bukan 401/200)", async () => {
				const res = await app.request("/api/tracking/ffffffffffffffff");
				// Kontrak saat ini: 501 NOT_IMPLEMENTED sampai logic tracking dibuat.
				expect(res.status).toBe(501);
			});
			test.todo("AC: user tanpa login dapat lihat status & estimasi selesai; tidak bisa melihat order customer lain", () => {});
		});

		describe("FR-OCS-04 (notifikasi otomatis saat status berubah)", () => {
			test("GET/POST /api/orders/:id/reminders ter-registrasi -> 501", async () => {
				await expectStub(
					ctx,
					"GET",
					"/api/orders/00000000-0000-0000-0000-000000000000/reminders",
				);
				await expectStub(
					ctx,
					"POST",
					"/api/orders/00000000-0000-0000-0000-000000000000/reminders",
				);
			});
			test.todo("AC: notifikasi terkirim <= 2 menit & delivery log tercatat (NFR-REL-03 retry 2x/15 menit)", () => {});
		});

		describe("FR-OCS-05 (profil & riwayat order customer)", () => {
			test("GET/POST /api/customers ter-registrasi -> 501", async () => {
				await expectStub(ctx, "GET", "/api/customers");
				await expectStub(ctx, "POST", "/api/customers");
			});
			test.todo("AC: semua order terkait nomor HP/email customer dapat diambil", () => {});
		});

		describe("FR-OCS-06 (screening budget vs tier)", () => {
			test("POST/GET /api/orders/:id/reviews ter-registrasi -> 501", async () => {
				await expectStub(
					ctx,
					"POST",
					"/api/orders/00000000-0000-0000-0000-000000000000/reviews",
				);
				await expectStub(
					ctx,
					"GET",
					"/api/orders/00000000-0000-0000-0000-000000000000/reviews",
				);
			});
			test.todo("AC: tier Premium Custom di bawah budget minimum -> tag Requires Review, tak bisa Confirmed tanpa approval", () => {});
		});

		describe("FR-OCS-07 (snapshot pricelist per order)", () => {
			test("POST /api/orders ter-registrasi -> 501", async () => {
				await expectStub(ctx, "POST", "/api/orders");
			});
			test.todo("AC: pricelist yang aktif saat order dibuat tersimpan & tetap tampil walau pricelist berubah", () => {});
		});

		describe("FR-OCS-08 (reminder tanpa respons dalam window)", () => {
			test("GET/POST /api/orders/:id/reminders ter-registrasi -> 501", async () => {
				await expectStub(
					ctx,
					"GET",
					"/api/orders/00000000-0000-0000-0000-000000000000/reminders",
				);
				await expectStub(
					ctx,
					"POST",
					"/api/orders/00000000-0000-0000-0000-000000000000/reminders",
				);
			});
			test.todo("AC: tepat satu reminder terkirim & tercatat setelah window tanpa respons", () => {});
		});

		describe("FR-OCS-09 (lepas slot produksi yang tidak direspons)", () => {
			test("PUT/GET /api/orders/:id/production-slots ter-registrasi -> 501", async () => {
				await expectStub(
					ctx,
					"PUT",
					"/api/orders/00000000-0000-0000-0000-000000000000/production-slots",
				);
				await expectStub(
					ctx,
					"GET",
					"/api/orders/00000000-0000-0000-0000-000000000000/production-slots",
				);
			});
			test.todo('AC: deadline kedua lewat -> status "Cancelled – No Response", slot kembali bookable', () => {});
		});

		describe("FR-OCS-10 (jadwal kirim/ambil vs kapasitas)", () => {
			test("POST /api/orders ter-registrasi -> 501", async () => {
				await expectStub(ctx, "POST", "/api/orders");
			});
			test.todo("AC: tanggal pengiriman tidak tersimpan bila < minimum lead time produk", () => {});
		});
	},
);
