import { createFileRoute, Link } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useState } from "react";
import { AppShell, Badge, Card, Chip, Empty, meta } from "@/components/app-shell";
import { AdaptiveText } from "@/components/adaptive-text";
import { dateFmt, orderStatusLabel, orderStatusTone, rupiah } from "@/lib/db/labels";
import { useDb } from "@/lib/db/store";
import type { OrderStatus } from "@/lib/db/types";

const FILTERS: (OrderStatus | "all")[] = ["all", "requires_review", "received", "confirmed", "in_production", "ready", "out_for_delivery", "completed", "cancelled_other"];

export const Route = createFileRoute("/orders/")({
  validateSearch: (s: Record<string, unknown>): { status?: OrderStatus } => (typeof s["status"] === "string" ? { status: s["status"] as OrderStatus } : {}),
  head: () => meta("Pesanan — Cakeshop Manager", "Daftar pesanan dari semua kanal dalam satu tempat."),
  component: Orders,
});

function Orders() {
  const db = useDb();
  const { status } = Route.useSearch();
  const nav = Route.useNavigate();
  const [q, setQ] = useState("");
  const filter = status ?? "all";
  const customer = (id: string) => db.customer.find((c) => c.id === id);
  const list = [...db.customerOrder]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .filter((o) => (filter === "all" || o.status === filter || (filter === "cancelled_other" && o.status === "cancelled_no_response")))
    .filter((o) => `${customer(o.customerId)?.name} ${o.orderNumber}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <AppShell title="Pesanan" subtitle={`${db.customerOrder.length} total`}>
      {(user) => (
        <>
          <label className="flex items-center gap-2 rounded-xl border bg-card px-4 py-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari pelanggan / no. pesanan" className="flex-1 bg-transparent text-sm outline-none" />
          </label>
          <div className="-mx-5 mt-4 flex gap-2 overflow-x-auto px-5 pb-1">
            {FILTERS.map((s) => (
              <Chip key={s} active={filter === s} onClick={() => nav({ search: s === "all" ? {} : { status: s } })}>
                {s === "all" ? "Semua" : orderStatusLabel[s]}
              </Chip>
            ))}
          </div>
          <div className="mt-4 space-y-2.5">
            {list.length === 0 && <Empty>Tidak ada pesanan.</Empty>}
            {list.map((o) => {
              const items = db.orderItem.filter((i) => i.orderId === o.id);
              return (
                <Link key={o.id} to="/orders/$id" params={{ id: o.id }} className="block">
                  <Card>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <AdaptiveText text={customer(o.customerId)?.name ?? ""} baseSize={16} minSize={12} />
                        <AdaptiveText
                          text={items.map((i) => `${i.quantity}× ${db.product.find((p) => p.id === i.productId)?.name}`).join(", ")}
                          baseSize={14} minSize={11} maxLines={2} weight={400} className="text-muted-foreground"
                        />
                      </div>
                      <Badge tone={orderStatusTone[o.status]}>{orderStatusLabel[o.status]}</Badge>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="rounded-md bg-muted px-2 py-0.5">{o.sourceChannel}</span>
                      <span>{o.orderNumber}</span>
                      <span>· {dateFmt(o.fulfillmentDate)}</span>
                      {user.role === "admin" && <span className="ml-auto font-semibold text-foreground">{rupiah(o.total)}</span>}
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </AppShell>
  );
}
