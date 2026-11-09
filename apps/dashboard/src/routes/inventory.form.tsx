import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell, Button, Field, inputCls, meta } from "@/components/app-shell";
import { ingredientsApi, uomsApi } from "@/lib/endpoints/ingredients";
import { getDb, mutate } from "@/lib/db/store";
import { latestPrice } from "@/lib/db/logic";
import type { UomDto } from "@bakery/shared-schemas";

export const Route = createFileRoute("/inventory/form")({
  validateSearch: (s: Record<string, unknown>): { id?: string } =>
    typeof s["id"] === "string" ? { id: s["id"] } : {},
  head: () => meta("Form Bahan Baku — Cakeshop Manager", "Tambah atau ubah bahan baku."),
  component: IngredientForm,
});

function IngredientForm() {
  const { id } = Route.useSearch();
  const nav = useNavigate();
  const ex = id ? getDb().ingredient.find((i) => i.id === id) : undefined;
  const [uoms, setUoms] = useState<UomDto[]>([]);
  const [name, setName] = useState(ex?.name ?? "");
  const [uomId, setUomId] = useState(ex?.purchaseUomId ?? "");
  const [min, setMin] = useState(String(ex?.minimumStock ?? ""));
  const [stock, setStock] = useState("");
  const [price, setPrice] = useState(ex ? String(latestPrice(getDb(), ex.id)) : "");
  const [active, setActive] = useState(ex?.isActive ?? true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    uomsApi.list()
      .then((response) => {
        setUoms(response.data);
        if (!uomId && response.data[0]) setUomId(response.data[0].id);
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : "Gagal memuat satuan"));
  }, []);

  const save = async () => {
    if (!name.trim()) {
      toast.error("Nama wajib diisi");
      return;
    }
    if (!uomId) {
      toast.error("Satuan beli wajib dipilih");
      return;
    }
    setSaving(true);
    try {
      const response = ex
        ? await ingredientsApi.update(ex.id, {
            name: name.trim(),
            purchaseUomId: uomId,
            minimumStock: min || "0",
            isActive: active,
          })
        : await ingredientsApi.create({
            name: name.trim(),
            purchaseUomId: uomId,
            currentStock: stock || "0",
            minimumStock: min || "0",
            isActive: true,
          });
      mutate((db) => {
        const ingredient = {
          id: response.id,
          name: response.name,
          purchaseUomId: response.purchaseUomId,
          currentStock: Number(response.currentStock),
          minimumStock: Number(response.minimumStock),
          isActive: response.isActive,
          createdAt: String(response.createdAt),
        };
        const index = db.ingredient.findIndex((item) => item.id === response.id);
        if (index >= 0) db.ingredient[index] = ingredient;
        else db.ingredient.push(ingredient);
      });
      if (price.trim()) {
        await ingredientsApi.addPrice(response.id, { price: price.trim() });
      }
      toast.success("Bahan disimpan");
      nav({ to: "/inventory/$id", params: { id: response.id }, replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Bahan gagal disimpan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell
      back
      adminOnly
      title={ex ? "Edit bahan" : "Bahan baru"}
      bottomBar={
        <Button className="w-full py-4" onClick={save} disabled={saving}>
          {saving ? "Menyimpan..." : "Simpan"}
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
              {uoms.map((u) => (
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
            <Field label="Stok awal" hint="Disimpan sebagai stok awal bahan.">
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
