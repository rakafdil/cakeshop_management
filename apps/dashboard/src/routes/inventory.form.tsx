import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell, Button, Field, inputCls, meta } from "@/components/app-shell";
import { applyStock, latestPrice, nowIso, uid } from "@/lib/db/logic";
import { getDb, mutate, useDb } from "@/lib/db/store";

export const Route = createFileRoute("/inventory/form")({
  validateSearch: (s: Record<string, unknown>): { id?: string } =>
    typeof s["id"] === "string" ? { id: s["id"] } : {},
  head: () => meta("Form Bahan Baku — Cakeshop Manager", "Tambah atau ubah bahan baku."),
  component: IngredientForm,
});

function IngredientForm() {
  const { id } = Route.useSearch();
  const db = useDb();
  const nav = useNavigate();
  const ex = id ? getDb().ingredient.find((i) => i.id === id) : undefined;
  const [name, setName] = useState(ex?.name ?? "");
  const [uomId, setUomId] = useState(ex?.purchaseUomId ?? "kg");
  const [min, setMin] = useState(String(ex?.minimumStock ?? ""));
  const [stock, setStock] = useState("");
  const [price, setPrice] = useState(ex ? String(latestPrice(getDb(), ex.id)) : "");
  const [active, setActive] = useState(ex?.isActive ?? true);

  const save = () => {
    if (!name.trim()) {
      toast.error("Nama wajib diisi");
      return;
    }
    const rid = mutate((d) => {
      if (ex) {
        const i = d.ingredient.find((x) => x.id === ex.id)!;
        Object.assign(i, {
          name: name.trim(),
          purchaseUomId: uomId,
          minimumStock: Number(min) || 0,
          isActive: active,
        });
        const prev = latestPrice(d, ex.id);
        if (price && Number(price) !== prev)
          d.ingredientPriceHistory.push({
            id: uid("ph"),
            ingredientId: ex.id,
            price: Number(price),
            previousPrice: prev,
            changedAt: nowIso(),
          });
        return ex.id;
      }
      const nid = uid("i");
      d.ingredient.push({
        id: nid,
        name: name.trim(),
        purchaseUomId: uomId,
        currentStock: 0,
        minimumStock: Number(min) || 0,
        isActive: true,
        createdAt: nowIso(),
      });
      d.ingredientPriceHistory.push({
        id: uid("ph"),
        ingredientId: nid,
        price: Number(price) || 0,
        previousPrice: null,
        changedAt: nowIso(),
      });
      if (Number(stock) > 0) applyStock(d, nid, "in", Number(stock));
      return nid;
    });
    toast.success("Bahan disimpan");
    nav({ to: "/inventory/$id", params: { id: rid }, replace: true });
  };

  return (
    <AppShell
      back
      adminOnly
      title={ex ? "Edit bahan" : "Bahan baru"}
      bottomBar={
        <Button className="w-full py-4" onClick={save}>
          Simpan
        </Button>
      }
    >
      {() => (
        <div className="space-y-4">
          <Field label="Nama bahan">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputCls}
              placeholder="cth. Keju Cheddar"
            />
          </Field>
          <Field label="Satuan beli">
            <select value={uomId} onChange={(e) => setUomId(e.target.value)} className={inputCls}>
              {db.uom.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.symbol})
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Harga per satuan">
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Stok minimum">
              <input
                type="number"
                step="any"
                value={min}
                onChange={(e) => setMin(e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>
          {!ex && (
            <Field label="Stok awal" hint="Tercatat sebagai mutasi stok masuk.">
              <input
                type="number"
                step="any"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className={inputCls}
              />
            </Field>
          )}
          {ex && (
            <label className="flex items-center justify-between rounded-xl border bg-card p-4 text-sm font-medium">
              Bahan aktif
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="h-5 w-5 accent-[var(--accent)]"
              />
            </label>
          )}
        </div>
      )}
    </AppShell>
  );
}
