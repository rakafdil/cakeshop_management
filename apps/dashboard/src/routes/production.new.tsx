import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell, Button, Card, Field, SectionTitle, inputCls, meta } from "@/components/app-shell";
import { qtyFmt } from "@/lib/db/labels";
import { convert, nowIso, today, uid } from "@/lib/db/logic";
import { mutate, useDb } from "@/lib/db/store";

export const Route = createFileRoute("/production/new")({
  head: () => meta("Jadwalkan Produksi — Cakeshop Manager", "Rencanakan produksi dan cek kebutuhan bahan."),
  component: NewProduction,
});

function NewProduction() {
  const db = useDb();
  const nav = useNavigate();
  const recipes = db.recipe.filter((r) => r.isComplete);
  const [recipeId, setRecipeId] = useState(recipes[0]?.id ?? "");
  const [qty, setQty] = useState("1");
  const [date, setDate] = useState(today());
  const recipe = db.recipe.find((r) => r.id === recipeId);
  const n = Number(qty) || 0;
  const needs = db.recipeIngredient.filter((ri) => ri.recipeId === recipeId).map((ri) => {
    const ing = db.ingredient.find((i) => i.id === ri.ingredientId)!;
    const need = convert(db, ri.quantity, ri.uomId, ing.purchaseUomId) * n;
    return { ing, need, uom: db.uom.find((u) => u.id === ing.purchaseUomId)?.symbol ?? "", short: need > ing.currentStock };
  });
  const shortage = needs.some((x) => x.short);

  const save = () => {
    if (!recipe || n <= 0) { toast.error("Pilih resep & jumlah"); return; }
    mutate((d) => { d.production.push({ id: uid("pr"), productId: recipe.productId, recipeId: recipe.id, quantity: n, status: "planned", productionDate: date, createdAt: nowIso() }); });
    toast.success("Produksi dijadwalkan");
    nav({ to: "/kitchen", search: { tab: "produksi" }, replace: true });
  };

  return (
    <AppShell back title="Jadwalkan produksi" bottomBar={<Button className="w-full py-4" onClick={save}>Jadwalkan</Button>}>
      {() => (
        <div className="space-y-4 pb-6">
          <Field label="Resep" hint="Hanya resep berstatus lengkap yang bisa diproduksi.">
            <select value={recipeId} onChange={(e) => setRecipeId(e.target.value)} className={inputCls}>
              {recipes.map((r) => <option key={r.id} value={r.id}>{db.product.find((p) => p.id === r.productId)?.name} · v{r.version}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Jumlah batch/resep"><input type="number" min={1} step="any" value={qty} onChange={(e) => setQty(e.target.value)} className={inputCls} /></Field>
            <Field label="Tanggal"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} /></Field>
          </div>

          <SectionTitle>Kebutuhan bahan</SectionTitle>
          <Card className="-mt-2 divide-y p-0">
            {needs.map((x) => (
              <div key={x.ing.id} className="flex justify-between p-3.5 text-sm">
                <span>{x.ing.name}</span>
                <span className={x.short ? "font-semibold text-destructive" : "text-muted-foreground"}>{qtyFmt(x.need)} / {qtyFmt(x.ing.currentStock)} {x.uom}</span>
              </div>
            ))}
          </Card>
          {shortage && <p className="flex items-center gap-2 text-xs text-destructive"><AlertTriangle className="h-4 w-4" />Ada bahan yang kurang. Restock dulu sebelum produksi selesai.</p>}
          <p className="text-xs text-muted-foreground">Stok baru dikurangi saat produksi ditandai selesai.</p>
        </div>
      )}
    </AppShell>
  );
}
