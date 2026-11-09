import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell, Button, Card, Chip, Field, Row, inputCls, meta } from "@/components/app-shell";
import { fulfillmentLabel, productionTypeLabel, rupiah, segmentLabel } from "@/lib/db/labels";
import { activeRecipe, nowIso, recipeCost, recommendedPrice, uid } from "@/lib/db/logic";
import { getDb, mutate, useDb } from "@/lib/db/store";
import type { FulfillmentType, MarketSegment, ProductionType } from "@/lib/db/types";

export const Route = createFileRoute("/products/form")({
  validateSearch: (s: Record<string, unknown>): { id?: string } => (typeof s["id"] === "string" ? { id: s["id"] } : {}),
  head: () => meta("Form Produk — Cakeshop Manager", "Tambah atau ubah produk dan aturan harganya."),
  component: ProductForm,
});

function ProductForm() {
  const { id } = Route.useSearch();
  const db = useDb();
  const nav = useNavigate();
  const init = getDb();
  const ex = id ? init.product.find((p) => p.id === id) : undefined;
  const [f, setF] = useState({
    name: ex?.name ?? "", description: ex?.description ?? "", productionType: ex?.productionType ?? ("batch" as ProductionType),
    fulfillmentType: ex?.fulfillmentType ?? ("hybrid" as FulfillmentType), marketSegment: ex?.marketSegment ?? ("everyday_budget" as MarketSegment),
    basePrice: String(ex?.basePrice ?? ""), isActive: ex?.isActive ?? true, categoryIds: ex?.categoryIds ?? ([] as string[]),
  });
  const rule = ex ? init.pricingRule.find((r) => r.productId === ex.id) : undefined;
  const globalMargin = init.pricingRule.find((r) => r.productId === null)?.targetMarginPercentage ?? 0.4;
  const [margin, setMargin] = useState(String(Math.round((rule?.targetMarginPercentage ?? globalMargin) * 100)));
  const recipe = ex ? activeRecipe(db, ex.id) : undefined;
  const cost = recipe ? recipeCost(db, recipe.id) : null;
  const rec = cost ? recommendedPrice(cost.hpp, Number(margin) / 100) : null;

  const save = () => {
    if (!f.name.trim()) { toast.error("Nama wajib diisi"); return; }
    if (!(Number(f.basePrice) >= 0)) { toast.error("Harga tidak valid"); return; }
    if (!(Number(margin) >= 0 && Number(margin) < 100)) { toast.error("Margin harus 0–99%"); return; }
    mutate((d) => {
      const pid = ex?.id ?? uid("p");
      const data = { name: f.name.trim(), description: f.description || null, productionType: f.productionType, fulfillmentType: f.fulfillmentType, marketSegment: f.marketSegment, basePrice: Number(f.basePrice) || 0, isActive: f.isActive, categoryIds: f.categoryIds };
      const p = d.product.find((x) => x.id === pid);
      if (p) Object.assign(p, data); else d.product.push({ id: pid, createdAt: nowIso(), ...data });
      const m = Number(margin) / 100;
      const r = d.pricingRule.find((x) => x.productId === pid);
      if (m === globalMargin) d.pricingRule = d.pricingRule.filter((x) => x.productId !== pid);
      else if (r) r.targetMarginPercentage = m;
      else d.pricingRule.push({ id: uid("pru"), productId: pid, targetMarginPercentage: m });
    });
    toast.success("Produk disimpan");
    nav({ to: "/kitchen", search: { tab: "produk" }, replace: true });
  };

  return (
    <AppShell back adminOnly title={ex ? "Edit produk" : "Produk baru"} bottomBar={<Button className="w-full py-4" onClick={save}>Simpan produk</Button>}>
      {() => (
        <div className="space-y-5 pb-6">
          <Field label="Nama produk"><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={inputCls} /></Field>
          <Field label="Deskripsi"><textarea rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} className={inputCls} /></Field>
          <Field label="Kategori">
            <div className="flex flex-wrap gap-2">{db.productCategory.map((c) => <Chip key={c.id} active={f.categoryIds.includes(c.id)} onClick={() => setF({ ...f, categoryIds: f.categoryIds.includes(c.id) ? f.categoryIds.filter((x) => x !== c.id) : [...f.categoryIds, c.id] })}>{c.name}</Chip>)}</div>
          </Field>
          <Field label="Tipe produksi">
            <div className="flex gap-2">{(Object.keys(productionTypeLabel) as ProductionType[]).map((k) => <Chip key={k} active={f.productionType === k} onClick={() => setF({ ...f, productionType: k })}>{productionTypeLabel[k]}</Chip>)}</div>
          </Field>
          <Field label="Pemenuhan">
            <div className="flex flex-wrap gap-2">{(Object.keys(fulfillmentLabel) as FulfillmentType[]).map((k) => <Chip key={k} active={f.fulfillmentType === k} onClick={() => setF({ ...f, fulfillmentType: k })}>{fulfillmentLabel[k]}</Chip>)}</div>
          </Field>
          <Field label="Segmen pasar" hint="Pesanan premium dengan budget di bawah total akan masuk review.">
            <div className="flex gap-2">{(Object.keys(segmentLabel) as MarketSegment[]).map((k) => <Chip key={k} active={f.marketSegment === k} onClick={() => setF({ ...f, marketSegment: k })}>{segmentLabel[k]}</Chip>)}</div>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Harga jual"><input type="number" value={f.basePrice} onChange={(e) => setF({ ...f, basePrice: e.target.value })} className={inputCls} /></Field>
            <Field label="Target margin %"><input type="number" value={margin} onChange={(e) => setMargin(e.target.value)} className={inputCls} /></Field>
          </div>
          {cost && rec != null && (
            <Card className="space-y-2 bg-secondary/50">
              <Row l={`HPP (resep v${recipe?.version})`} v={rupiah(cost.hpp)} />
              <Row l="Harga minimum rekomendasi" v={rupiah(rec)} bold />
              {Number(f.basePrice) < rec && <p className="text-xs text-destructive">Harga jual di bawah rekomendasi.</p>}
              <button onClick={() => setF({ ...f, basePrice: String(rec) })} className="text-sm font-medium text-accent">Pakai harga rekomendasi</button>
            </Card>
          )}
          {ex && (
            <label className="flex items-center justify-between rounded-xl border bg-card p-4 text-sm font-medium">
              Produk aktif<input type="checkbox" checked={f.isActive} onChange={(e) => setF({ ...f, isActive: e.target.checked })} className="h-5 w-5 accent-[var(--accent)]" />
            </label>
          )}
        </div>
      )}
    </AppShell>
  );
}
