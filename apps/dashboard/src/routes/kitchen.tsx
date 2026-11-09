import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Clock, Plus, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell, Badge, Button, Card, Chip, Empty, meta } from "@/components/app-shell";
import { dateFmt, fulfillmentLabel, productionStatusLabel, productionStatusTone, productionTypeLabel, qtyFmt, rupiah, segmentLabel } from "@/lib/db/labels";
import { activeRecipe, completeProduction, latestPrice, recipeCost } from "@/lib/db/logic";
import { mutate, useDb } from "@/lib/db/store";

type Tab = "produksi" | "resep" | "inventori" | "produk";
const TABS: Record<Tab, string> = { produksi: "Produksi", resep: "Resep", inventori: "Inventori", produk: "Produk" };

const FILTERS: Record<Tab, { key: string; label: string }[]> = {
  produksi: [
    { key: "all", label: "Semua" },
    ...Object.entries(productionStatusLabel).map(([key, label]) => ({ key, label })),
  ],
  resep: [
    { key: "all", label: "Semua" },
    { key: "lengkap", label: "Lengkap" },
    { key: "draf", label: "Draf" },
  ],
  inventori: [
    { key: "all", label: "Semua" },
    { key: "menipis", label: "Stok menipis" },
  ],
  produk: [
    { key: "all", label: "Semua" },
    { key: "batch", label: "Batch" },
    { key: "unit", label: "Unit" },
    { key: "pre_order", label: "Pre-order" },
    { key: "ready_stock", label: "Ready stock" },
    { key: "hybrid", label: "Hybrid" },
  ],
};

export const Route = createFileRoute("/kitchen")({
  validateSearch: (s: Record<string, unknown>): { tab?: Tab } => (typeof s["tab"] === "string" && s["tab"] in TABS ? { tab: s["tab"] as Tab } : {}),
  head: () => meta("Dapur — Cakeshop Manager", "Produksi, resep, inventori bahan baku, dan produk."),
  component: Kitchen,
});

function Kitchen() {
  const db = useDb();
  const { tab = "produksi" } = Route.useSearch();
  const nav = Route.useNavigate();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const productName = (id: string) => db.product.find((p) => p.id === id)?.name ?? "-";
  const uom = (id: string) => db.uom.find((u) => u.id === id)?.symbol ?? "";
  const match = (s: string) => s.toLowerCase().includes(q.trim().toLowerCase());

  return (
    <AppShell title="Dapur" subtitle="Produksi & gudang">
      {(user) => {
        const isAdmin = user.role === "admin";
        const addLink = {
          produksi: <Link to="/production/new" className="add-btn"><Plus className="h-4 w-4" />Jadwalkan produksi</Link>,
          resep: isAdmin ? <Link to="/recipes/form" search={{}} className="add-btn"><Plus className="h-4 w-4" />Resep baru</Link> : null,
          inventori: isAdmin ? <Link to="/inventory/form" search={{}} className="add-btn"><Plus className="h-4 w-4" />Bahan baru</Link> : null,
          produk: isAdmin ? <Link to="/products/form" search={{}} className="add-btn"><Plus className="h-4 w-4" />Produk baru</Link> : null,
        }[tab];

        return (
          <>
            <div className="-mx-5 flex gap-2 overflow-x-auto px-5">
              {(Object.keys(TABS) as Tab[]).map((t) => <Chip key={t} active={tab === t} onClick={() => { setFilter("all"); nav({ search: { tab: t } }); }}>{TABS[t]}</Chip>)}
            </div>
            {addLink && <div className="mt-4">{addLink}</div>}

            <label className="mt-4 flex items-center gap-2 rounded-xl border bg-card px-4 py-3">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Cari ${TABS[tab].toLowerCase()}...`} className="flex-1 bg-transparent text-sm outline-none" />
            </label>
            <div className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1">
              {FILTERS[tab].map((f) => <Chip key={f.key} active={filter === f.key} onClick={() => setFilter(f.key)}>{f.label}</Chip>)}
            </div>

            {tab === "produksi" && (
              <div className="mt-4 space-y-2.5">
                {db.production.length === 0 && <Empty>Belum ada produksi.</Empty>}
                {[...db.production]
                  .filter((p) => (filter === "all" || p.status === filter) && match(productName(p.productId)))
                  .sort((a, b) => b.productionDate.localeCompare(a.productionDate)).map((p) => (
                  <Card key={p.id}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold">{productName(p.productId)}</p>
                        <p className="text-xs text-muted-foreground">{qtyFmt(p.quantity)}× resep v{db.recipe.find((r) => r.id === p.recipeId)?.version} · {dateFmt(p.productionDate, { weekday: "short", day: "numeric", month: "short" })}</p>
                      </div>
                      <Badge tone={productionStatusTone[p.status]}>{productionStatusLabel[p.status]}</Badge>
                    </div>
                    {(p.status === "planned" || p.status === "in_progress") && (
                      <div className="mt-3 flex gap-2">
                        <Link to="/recipes/$id" params={{ id: p.recipeId }} className="flex-1 rounded-xl border py-2.5 text-center text-sm font-medium">Lihat resep</Link>
                        {p.status === "planned" ? (
                          <Button className="flex-1 py-2.5" onClick={() => { mutate((d) => { d.production.find((x) => x.id === p.id)!.status = "in_progress"; }); toast.success("Produksi dimulai"); }}>Mulai</Button>
                        ) : (
                          <Button variant="accent" className="flex-1 py-2.5" onClick={() => { mutate((d) => completeProduction(d, p.id)); toast.success("Selesai — stok bahan otomatis dikurangi"); }}>Selesai</Button>
                        )}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}

            {tab === "resep" && (
              <div className="mt-4 space-y-2.5">
                {db.recipe
                  .filter((r) => (filter === "all" || (filter === "draf" ? !r.isComplete : r.isComplete)) && match(productName(r.productId)))
                  .map((r) => {
                  const cost = isAdmin ? recipeCost(db, r.id) : null;
                  return (
                    <Link key={r.id} to="/recipes/$id" params={{ id: r.id }} className="block">
                      <Card className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary font-display text-lg font-semibold text-accent">{productName(r.productId).charAt(0)}</div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold">{productName(r.productId)} <span className="text-xs font-normal text-muted-foreground">v{r.version}</span></p>
                          <p className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3 w-3" />{r.estimatedLaborMinutes} mnt · Level {r.difficultyLevel}/5{cost && ` · HPP ${rupiah(cost.hpp)}`}</p>
                        </div>
                        {!r.isComplete && <Badge tone="bg-warning/25 text-foreground">Draf</Badge>}
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </Card>
                    </Link>
                  );
                })}
              </div>
            )}

            {tab === "inventori" && (
              <div className="mt-4 space-y-2.5">
                {db.ingredient.filter((i) => i.isActive).filter((i) => (filter === "all" || i.currentStock < i.minimumStock) && match(i.name)).map((i) => {
                  const low = i.currentStock < i.minimumStock;
                  const pct = Math.min(100, (i.currentStock / Math.max(i.minimumStock * 2.5, 0.001)) * 100);
                  return (
                    <Link key={i.id} to="/inventory/$id" params={{ id: i.id }} className="block">
                      <Card>
                        <div className="flex justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate font-semibold">{i.name}</p>
                            {isAdmin && <p className="text-xs text-muted-foreground">{rupiah(latestPrice(db, i.id))}/{uom(i.purchaseUomId)}</p>}
                          </div>
                          <p className={`font-display text-lg font-semibold ${low ? "text-destructive" : ""}`}>{qtyFmt(i.currentStock)} <span className="text-xs font-normal text-muted-foreground">{uom(i.purchaseUomId)}</span></p>
                        </div>
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full ${low ? "bg-destructive" : "bg-success"}`} style={{ width: `${pct}%` }} /></div>
                        <p className="mt-1.5 text-[11px] text-muted-foreground">Minimum {qtyFmt(i.minimumStock)} {uom(i.purchaseUomId)}</p>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            )}

            {tab === "produk" && (
              <div className="mt-4 space-y-2.5">
                {db.product.filter((p) => (filter === "all" || p.productionType === filter || p.fulfillmentType === filter) && match(p.name)).map((p) => {
                  const r = activeRecipe(db, p.id);
                  const cost = isAdmin && r ? recipeCost(db, r.id) : null;
                  const body = (
                    <Card className={`flex items-center gap-3 ${p.isActive ? "" : "opacity-50"}`}>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{p.name}</p>
                        <div className="mt-1 flex flex-wrap gap-1.5 text-[11px]">
                          <span className="rounded-md bg-secondary px-2 py-0.5">{productionTypeLabel[p.productionType]}</span>
                          <span className="rounded-md bg-accent/10 px-2 py-0.5 text-accent">{fulfillmentLabel[p.fulfillmentType]}</span>
                          <span className="rounded-md bg-muted px-2 py-0.5">{segmentLabel[p.marketSegment]}</span>
                        </div>
                      </div>
                      {isAdmin && (
                        <div className="text-right">
                          <p className="font-semibold">{rupiah(p.basePrice)}</p>
                          <p className="text-[11px] text-muted-foreground">{cost ? `HPP ${rupiah(cost.hpp)}` : "Tanpa resep"}</p>
                        </div>
                      )}
                    </Card>
                  );
                  return isAdmin ? <Link key={p.id} to="/products/form" search={{ id: p.id }} className="block">{body}</Link> : <div key={p.id}>{body}</div>;
                })}
              </div>
            )}
          </>
        );
      }}
    </AppShell>
  );
}
