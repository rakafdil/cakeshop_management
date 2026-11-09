import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, CalendarDays, ChevronRight, Flag, Play } from "lucide-react";
import { AppShell, Badge, Card, SectionTitle, meta } from "@/components/app-shell";
import { dateFmt, orderStatusLabel, orderStatusTone, productionStatusLabel, productionStatusTone, qtyFmt, rupiah } from "@/lib/db/labels";
import { today } from "@/lib/db/logic";
import { useDb } from "@/lib/db/store";

export const Route = createFileRoute("/")({
  head: () => meta("Beranda — Cakeshop Manager", "Ringkasan harian toko kue: pesanan, produksi, stok, dan pendapatan."),
  component: Index,
});

function Index() {
  const db = useDb();
  const orders = db.customerOrder;
  const active = orders.filter((o) => !["completed", "cancelled_no_response", "cancelled_other"].includes(o.status));
  const review = orders.filter((o) => o.status === "requires_review");
  const alerts = db.stockAlert.filter((a) => !a.isResolved);
  const runs = db.production.filter((p) => p.status === "planned" || p.status === "in_progress");
  const monthIncome = db.financialTransaction.filter((t) => t.type === "income" && t.transactionDate.slice(0, 7) === today().slice(0, 7)).reduce((s, t) => s + t.amount, 0);
  const customer = (id: string) => db.customer.find((c) => c.id === id)?.name ?? "-";
  const product = (id: string) => db.product.find((p) => p.id === id)?.name ?? "-";

  return (
    <AppShell>
      {(user) => {
        const isAdmin = user.role === "admin";
        return (
          <>
            <section className="-mx-5 rounded-b-[2rem] bg-hero px-5 pb-7 pt-8 text-primary-foreground">
              <div className="flex items-center justify-between">
                <p className="text-sm opacity-80">{new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" })}</p>
                <span className="rounded-full bg-primary-foreground/15 px-2.5 py-1 text-[11px] font-semibold">{isAdmin ? "Pemilik" : "Pegawai"}</span>
              </div>
              <h1 className="mt-1 font-display text-3xl font-semibold">Halo, {user.name.split(" ")[0]} ☕</h1>
              <div className="mt-6 grid grid-cols-3 gap-3">
                {[
                  isAdmin ? { l: "Masuk bulan ini", v: `${(monthIncome / 1e6).toLocaleString("id-ID", { maximumFractionDigits: 1 })}jt` } : { l: "Produksi", v: String(runs.length) },
                  { l: "Pesanan aktif", v: String(active.length) },
                  { l: "Stok menipis", v: String(alerts.length) },
                ].map((s) => (
                  <div key={s.l} className="rounded-2xl bg-primary-foreground/10 p-3">
                    <p className="text-[11px] opacity-75">{s.l}</p>
                    <p className="mt-1 font-display text-xl font-semibold">{s.v}</p>
                  </div>
                ))}
              </div>
            </section>

            <Link to="/calendar" className="mt-5 flex items-center gap-3 rounded-lg border p-4"><CalendarDays className="h-5 w-5 text-accent" /><span className="flex-1 font-semibold">Kalender bisnis</span><ChevronRight className="h-4 w-4 text-muted-foreground" /></Link>

            {isAdmin && review.length > 0 && (
              <Link to="/orders" search={{ status: "requires_review" }} className="mt-5 flex items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
                <Flag className="h-5 w-5 shrink-0 text-destructive" />
                <p className="flex-1 text-sm font-semibold">{review.length} pesanan menunggu persetujuanmu</p>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            )}

            {alerts.length > 0 && (
              <Link to="/kitchen" search={{ tab: "inventori" }} className="mt-3 flex items-center gap-3 rounded-2xl border border-warning/50 bg-warning/10 p-4">
                <AlertTriangle className="h-5 w-5 shrink-0 text-foreground" />
                <div className="flex-1 text-sm">
                  <p className="font-semibold">{alerts.length} bahan di bawah stok minimum</p>
                  <p className="text-muted-foreground">{alerts.map((a) => db.ingredient.find((i) => i.id === a.ingredientId)?.name).join(", ")}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            )}

            <SectionTitle action={<Link to="/kitchen" search={{ tab: "produksi" }} className="text-sm font-medium text-accent">Semua</Link>}>Produksi hari ini</SectionTitle>
            <div className="space-y-2.5">
              {runs.length === 0 && <Card className="text-sm text-muted-foreground">Tidak ada jadwal produksi.</Card>}
              {runs.slice(0, 3).map((r) => (
                <Card key={r.id} className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary"><Play className="h-4 w-4 text-accent" /></div>
                  <div className="flex-1">
                    <p className="font-semibold">{product(r.productId)}</p>
                    <p className="text-xs text-muted-foreground">{qtyFmt(r.quantity)} batch · {dateFmt(r.productionDate)}</p>
                  </div>
                  <Badge tone={productionStatusTone[r.status]}>{productionStatusLabel[r.status]}</Badge>
                </Card>
              ))}
            </div>

            <SectionTitle action={<Link to="/orders" className="text-sm font-medium text-accent">Semua</Link>}>Pesanan terdekat</SectionTitle>
            <div className="space-y-2.5">
              {[...active].sort((a, b) => (a.fulfillmentDate ?? "").localeCompare(b.fulfillmentDate ?? "")).slice(0, 4).map((o) => (
                <Link key={o.id} to="/orders/$id" params={{ id: o.id }} className="block">
                  <Card className="flex items-center gap-3">
                    <div className="flex h-11 w-11 flex-col items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                      <span className="text-[10px] leading-none">{dateFmt(o.fulfillmentDate, { month: "short" })}</span>
                      <span className="font-display text-lg font-semibold leading-none">{dateFmt(o.fulfillmentDate, { day: "2-digit" })}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{customer(o.customerId)}</p>
                      <p className="truncate text-xs text-muted-foreground">{o.orderNumber} · {o.sourceChannel}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge tone={orderStatusTone[o.status]}>{orderStatusLabel[o.status]}</Badge>
                      {isAdmin && <span className="text-xs text-muted-foreground">{rupiah(o.total)}</span>}
                    </div>
                  </Card>
                </Link>
              ))}
            </div>

            <SectionTitle>Saran ready-stock</SectionTitle>
            <div className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-2">
              {db.salesForecast.map((f) => (
                <Card key={f.id} className="w-40 shrink-0">
                  <p className="text-sm font-semibold">{product(f.productId)}</p>
                  <p className="mt-1 font-display text-2xl font-semibold">{qtyFmt(f.recommendedQuantity)} <span className="text-sm font-normal text-muted-foreground">pcs</span></p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-accent" style={{ width: `${f.confidenceScore * 100}%` }} /></div>
                  <p className="mt-1 text-[11px] text-muted-foreground">Keyakinan {Math.round(f.confidenceScore * 100)}%</p>
                </Card>
              ))}
            </div>
          </>
        );
      }}
    </AppShell>
  );
}
