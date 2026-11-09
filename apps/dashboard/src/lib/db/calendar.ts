import type { Db, UserRole } from "./types";
import { contentStatusLabel, orderStatusLabel, productionStatusLabel, qtyFmt } from "./labels";

export type EventKind = "order" | "production" | "content" | "restock" | "other";
export type BusinessEvent = {
  id: string; sourceId: string; source: "order" | "history" | "production" | "content" | "stock" | "activity";
  kind: EventKind; title: string; date: string; time: string; notes: string; status: string;
  state: "planned" | "completed" | "cancelled";
};
export const eventLabels: Record<EventKind, string> = { order: "Pesanan", production: "Produksi", content: "Konten", restock: "Restok", other: "Lainnya" };

export function localDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function stamp(value: string) {
  const date = new Date(value);
  return { date: localDate(date), time: date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false }).replace(".", ":") };
}
export function monthDays(month: string): (string | null)[] {
  const [year = 2026, number = 1] = month.split("-").map(Number);
  const first = new Date(year, number - 1, 1);
  const padding = (first.getDay() + 6) % 7;
  const total = new Date(year, number, 0).getDate();
  const cells: (string | null)[] = Array.from({ length: padding }, () => null);
  for (let day = 1; day <= total; day++) cells.push(localDate(new Date(year, number - 1, day)));
  while (cells.length % 7) cells.push(null);
  return cells;
}

export function businessEvents(db: Db, role: UserRole): BusinessEvent[] {
  const events: BusinessEvent[] = [];
  for (const order of db.customerOrder) {
    if (!order.fulfillmentDate) continue;
    events.push({ id: `order-${order.id}`, sourceId: order.id, source: "order", kind: "order", title: `${order.orderNumber} · ${db.customer.find(c => c.id === order.customerId)?.name ?? "Pelanggan"}`, date: order.fulfillmentDate.slice(0, 10), time: order.fulfillmentTime?.slice(0, 5) ?? "", notes: [db.orderItem.filter(i => i.orderId === order.id).map(i => `${qtyFmt(i.quantity)}× ${db.product.find(p => p.id === i.productId)?.name ?? "Produk"}`).join(", "), order.deliveryAddress].filter(Boolean).join(" · "), status: orderStatusLabel[order.status], state: order.status.startsWith("cancelled") ? "cancelled" : order.status === "completed" ? "completed" : "planned" });
  }
  for (const history of db.orderStatusHistory) {
    const order = db.customerOrder.find(o => o.id === history.orderId);
    if (!order) continue;
    events.push({ id: `history-${history.id}`, sourceId: order.id, source: "history", kind: "order", title: `${order.orderNumber} · ${orderStatusLabel[history.newStatus]}`, ...stamp(history.changedAt), notes: "Riwayat status pesanan", status: "Tercatat", state: "completed" });
  }
  for (const run of db.production) events.push({ id: `production-${run.id}`, sourceId: run.id, source: "production", kind: "production", title: db.product.find(p => p.id === run.productId)?.name ?? "Produksi", date: run.productionDate.slice(0, 10), time: "", notes: `${qtyFmt(run.quantity)}× resep`, status: productionStatusLabel[run.status], state: run.status === "completed" ? "completed" : run.status === "cancelled" ? "cancelled" : "planned" });
  if (role === "admin") for (const content of db.content) {
    if (!content.scheduledDate) continue;
    events.push({ id: `content-${content.id}`, sourceId: content.id, source: "content", kind: "content", title: content.title, date: content.scheduledDate.slice(0, 10), time: "", notes: `${content.platform} · ${content.content}`, status: contentStatusLabel[content.status], state: content.status === "posted" ? "completed" : content.status === "skipped" ? "cancelled" : "planned" });
  }
  for (const tx of db.stockTransaction) {
    if (tx.transactionType !== "in") continue;
    const ingredient = db.ingredient.find(i => i.id === tx.ingredientId);
    events.push({ id: `stock-${tx.id}`, sourceId: tx.ingredientId, source: "stock", kind: "restock", title: `Restok ${ingredient?.name ?? "bahan"}`, ...stamp(tx.createdAt), notes: `${qtyFmt(tx.quantity)} ${db.uom.find(u => u.id === ingredient?.purchaseUomId)?.symbol ?? ""} masuk`, status: "Stok masuk", state: "completed" });
  }
  for (const plan of db.calendarActivity ?? []) events.push({ id: `activity-${plan.id}`, sourceId: plan.id, source: "activity", kind: plan.kind, title: plan.title, date: plan.date, time: plan.time, notes: plan.notes, status: plan.status === "planned" ? "Direncanakan" : plan.status === "completed" ? "Selesai" : "Batal", state: plan.status });
  return events.sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`) || a.id.localeCompare(b.id));
}