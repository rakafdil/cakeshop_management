import type { Db, OrderStatus, StockTransactionType } from "./types";

export const uid = (p = "id") => `${p}-${Math.random().toString(36).slice(2, 9)}`;
export const nowIso = () => new Date().toISOString();
export const today = () => new Date().toISOString().slice(0, 10);

/** Convert a quantity between units using uom_conversion (either direction). */
export function convert(db: Db, qty: number, fromUomId: string, toUomId: string): number {
  if (fromUomId === toUomId) return qty;
  const direct = db.uomConversion.find((c) => c.fromUomId === fromUomId && c.toUomId === toUomId);
  if (direct) return qty * direct.conversionFactor;
  const inverse = db.uomConversion.find((c) => c.fromUomId === toUomId && c.toUomId === fromUomId);
  if (inverse) return qty / inverse.conversionFactor;
  throw new Error(`Tidak ada konversi ${fromUomId} → ${toUomId}`);
}

export function latestPrice(db: Db, ingredientId: string) {
  const h = db.ingredientPriceHistory.filter((p) => p.ingredientId === ingredientId).sort((a, b) => b.changedAt.localeCompare(a.changedAt));
  return h[0]?.price ?? 0;
}

export function currentLaborRate(db: Db) {
  return [...db.laborRate].sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))[0]?.ratePerHour ?? 0;
}

export const complexityMultiplier = (difficulty: number) => 1 + (difficulty - 1) * 0.1;

/** product_cost for a recipe: material + labor + tool depreciation, × complexity, + risk buffer. */
export function recipeCost(db: Db, recipeId: string) {
  const recipe = db.recipe.find((r) => r.id === recipeId);
  if (!recipe) return null;
  const lines = db.recipeIngredient.filter((ri) => ri.recipeId === recipeId).map((ri) => {
    const ing = db.ingredient.find((i) => i.id === ri.ingredientId)!;
    const qtyInPurchase = convert(db, ri.quantity, ri.uomId, ing.purchaseUomId);
    return { ...ri, ingredient: ing, qtyInPurchase, cost: qtyInPurchase * latestPrice(db, ing.id) };
  });
  const materialCost = lines.reduce((s, l) => s + l.cost, 0);
  const laborCost = (recipe.estimatedLaborMinutes / 60) * currentLaborRate(db);
  const toolDepreciation = db.recipeTool.filter((rt) => rt.recipeId === recipeId).reduce((s, rt) => {
    const tool = db.tool.find((x) => x.id === rt.toolId);
    return s + (tool ? (tool.purchaseCost / tool.usefulLife) * rt.quantity : 0);
  }, 0);
  const cm = complexityMultiplier(recipe.difficultyLevel);
  const base = (materialCost + laborCost + toolDepreciation) * cm;
  const riskBuffer = base * db.riskBufferPercentage;
  return { lines, materialCost, laborCost, toolDepreciation, complexityMultiplier: cm, riskBuffer, hpp: Math.round(base + riskBuffer) };
}

export function activeRecipe(db: Db, productId: string) {
  return db.recipe.filter((r) => r.productId === productId).sort((a, b) => Number(b.isComplete) - Number(a.isComplete) || b.version.localeCompare(a.version))[0];
}

export function targetMargin(db: Db, productId: string) {
  return (db.pricingRule.find((p) => p.productId === productId) ?? db.pricingRule.find((p) => p.productId === null))?.targetMarginPercentage ?? 0.4;
}

/** FR-FBA-04: recommended price = HPP ÷ (1 − margin). */
export const recommendedPrice = (hpp: number, margin: number) => Math.round(hpp / (1 - margin));

/** FR-PIM-03: a recipe is complete only when ingredients, steps and quantities exist. */
export function canBeComplete(steps: string, ingredientCount: number) {
  return steps.trim().length > 0 && ingredientCount > 0;
}

/** Apply a stock movement; returns the transaction and raises/clears alerts. Mutates db. */
export function applyStock(db: Db, ingredientId: string, type: StockTransactionType, qty: number, refs: { productionId?: string | null; orderId?: string | null } = {}) {
  const ing = db.ingredient.find((i) => i.id === ingredientId);
  if (!ing) throw new Error("Bahan tidak ditemukan");
  const before = ing.currentStock;
  let after: number;
  if (type === "in") after = before + qty;
  else if (type === "adjustment") after = qty; // qty = stok hasil hitung fisik
  else after = before - qty;
  after = Math.max(0, Math.round(after * 1000) / 1000);
  ing.currentStock = after;
  const tx = { id: uid("st"), ingredientId, transactionType: type, quantity: qty, stockBefore: before, stockAfter: after, productionId: refs.productionId ?? null, orderId: refs.orderId ?? null, createdAt: nowIso() };
  db.stockTransaction.push(tx);
  const open = db.stockAlert.find((a) => a.ingredientId === ingredientId && !a.isResolved);
  if (after < ing.minimumStock) {
    if (open) open.stockLevel = after;
    else db.stockAlert.push({ id: uid("sa"), ingredientId, stockLevel: after, threshold: ing.minimumStock, isResolved: false, createdAt: nowIso() });
  } else if (open) open.isResolved = true;
  return tx;
}

/** FR-PIM-06: completing a production run deducts recipe quantities × batches from stock. */
export function completeProduction(db: Db, productionId: string) {
  const p = db.production.find((x) => x.id === productionId);
  if (!p || p.status === "completed") return;
  for (const ri of db.recipeIngredient.filter((r) => r.recipeId === p.recipeId)) {
    const ing = db.ingredient.find((i) => i.id === ri.ingredientId)!;
    applyStock(db, ing.id, "out", convert(db, ri.quantity, ri.uomId, ing.purchaseUomId) * p.quantity, { productionId: p.id });
  }
  p.status = "completed";
}

/** FR-OCS-06: premium items whose stated budget is below their subtotal need review. */
export function screeningReason(db: Db, items: { productId: string; subtotal: number; statedBudget: number | null }[]) {
  for (const it of items) {
    const prod = db.product.find((p) => p.id === it.productId);
    if (prod?.marketSegment === "premium_artisan" && it.statedBudget != null && it.statedBudget < it.subtotal) {
      return `Budget pelanggan (Rp${it.statedBudget.toLocaleString("id-ID")}) di bawah total ${prod.name} (Rp${it.subtotal.toLocaleString("id-ID")})`;
    }
  }
  return null;
}

export const ORDER_FLOW: OrderStatus[] = ["received", "confirmed", "in_production", "ready", "out_for_delivery", "completed"];

export function nextStatus(s: OrderStatus): OrderStatus | null {
  const i = ORDER_FLOW.indexOf(s);
  return i >= 0 && i < ORDER_FLOW.length - 1 ? ORDER_FLOW[i + 1]! : null;
}

export function setOrderStatus(db: Db, orderId: string, status: OrderStatus, userId: string | null) {
  const o = db.customerOrder.find((x) => x.id === orderId);
  if (!o) return;
  if (o.status === "requires_review" && status === "confirmed" && db.orderReview.some((r) => r.orderId === orderId && r.status !== "approved")) {
    throw new Error("Pesanan perlu disetujui pemilik dulu");
  }
  db.orderStatusHistory.push({ id: uid("h"), orderId, oldStatus: o.status, newStatus: status, changedAt: nowIso(), changedBy: userId });
  o.status = status;
}
