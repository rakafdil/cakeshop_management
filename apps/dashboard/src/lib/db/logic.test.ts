import { describe, expect, it } from "vitest";
import { applyStock, canBeComplete, completeProduction, convert, recommendedPrice, screeningReason, setOrderStatus } from "./logic";
import { seed } from "./seed";

const fresh = () => structuredClone(seed);

describe("business rules", () => {
  it("harga minimum = HPP / (1 - margin)", () => {
    expect(recommendedPrice(60000, 0.4)).toBe(100000);
  });

  it("250 g dikonversi menjadi 0,25 kg", () => {
    expect(convert(fresh(), 250, "g", "kg")).toBeCloseTo(0.25);
  });

  it("selesai produksi mengurangi stok sesuai resep × batch", () => {
    const db = fresh();
    // pr2: Cinnamon Roll ×1 -> tepung 450 g
    const before = db.ingredient.find((i) => i.id === "i2")!.currentStock;
    completeProduction(db, "pr2");
    expect(db.ingredient.find((i) => i.id === "i2")!.currentStock).toBeCloseTo(before - 0.45);
  });

  it("stok di bawah minimum memunculkan peringatan", () => {
    const db = fresh();
    applyStock(db, "i3", "out", 4); // 6.5 -> 2.5, min 3
    expect(db.stockAlert.some((a) => a.ingredientId === "i3" && !a.isResolved)).toBe(true);
  });

  it("resep tidak bisa lengkap tanpa langkah atau bahan", () => {
    expect(canBeComplete("", 3)).toBe(false);
    expect(canBeComplete("Aduk", 0)).toBe(false);
    expect(canBeComplete("Aduk", 1)).toBe(true);
  });

  it("produk premium dengan budget di bawah total perlu review", () => {
    expect(screeningReason(fresh(), [{ productId: "p3", subtotal: 650000, statedBudget: 400000 }])).not.toBeNull();
    expect(screeningReason(fresh(), [{ productId: "p2", subtotal: 264000, statedBudget: 100000 }])).toBeNull();
  });

  it("pesanan perlu review tidak bisa dikonfirmasi sebelum disetujui", () => {
    expect(() => setOrderStatus(fresh(), "o3", "confirmed", "u-staff")).toThrow();
  });
});
