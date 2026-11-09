import { describe, expect, it } from "vitest";
import { businessEvents, monthDays } from "./calendar";
import { seed } from "./seed";

describe("business calendar", () => {
  it("menampilkan jadwal pesanan dan riwayat tanpa mengubah tanggal pemenuhan", () => {
    const db = structuredClone(seed);
    const order = db.customerOrder[0];
    if (!order) throw new Error("Missing order fixture");
    order.fulfillmentDate = "2026-11-03";
    order.fulfillmentTime = "14:30:00";
    const event = businessEvents(db, "admin").find(e => e.id === `order-${order.id}`);
    expect(event?.date).toBe("2026-11-03");
    expect(event?.time).toBe("14:30");
    expect(businessEvents(db, "admin").filter(e => e.source === "history").length).toBe(db.orderStatusHistory.length);
  });
  it("restok aktual hanya berasal dari transaksi stok masuk", () => {
    const db = structuredClone(seed);
    expect(businessEvents(db, "staff").filter(e => e.source === "stock").map(e => e.id).sort()).toEqual(db.stockTransaction.filter(t => t.transactionType === "in").map(t => `stock-${t.id}`).sort());
  });
  it("rencana restok tidak mengubah stok inventori", () => {
    const db = structuredClone(seed);
    const stock = db.ingredient.map(i => i.currentStock);
    db.calendarActivity = [{ id: "plan1", kind: "restock", title: "Beli butter", date: "2026-11-05", time: "09:00", notes: "2 kg", status: "completed", createdBy: "u-staff" }];
    expect(businessEvents(db, "staff").find(e => e.id === "activity-plan1")?.state).toBe("completed");
    expect(db.ingredient.map(i => i.currentStock)).toEqual(stock);
  });
  it("konten tetap khusus pemilik", () => {
    expect(businessEvents(seed, "staff").some(e => e.kind === "content")).toBe(false);
    expect(businessEvents(seed, "admin").filter(e => e.kind === "content").length).toBe(seed.content.filter(c => c.scheduledDate).length);
  });
  it("kalender Senin pertama mendukung pergantian bulan dan tahun kabisat", () => {
    expect(monthDays("2026-11")[6]).toBe("2026-11-01");
    expect(monthDays("2028-02").filter(Boolean)).toHaveLength(29);
    expect(monthDays("2026-12")).toContain("2026-12-31");
  });
});