import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  AppShell,
  Button,
  Card,
  Field,
  SectionTitle,
  inputCls,
  meta,
} from "@/components/app-shell";
import { rupiah } from "@/lib/db/labels";
import { canBeComplete, convert, currentLaborRate, latestPrice, nowIso, uid } from "@/lib/db/logic";
import { getDb, mutate, useDb } from "@/lib/db/store";

export const Route = createFileRoute("/recipes/form")({
  validateSearch: (s: Record<string, unknown>): { id?: string } =>
    typeof s["id"] === "string" ? { id: s["id"] } : {},
  head: () => meta("Form Resep — Cakeshop Manager", "Tambah atau ubah resep produk."),
  component: RecipeForm,
});

type IngLine = {
  key: string;
  ingredientId: string;
  quantity: string;
  uomId: string;
  notes: string;
};
type ToolLine = { key: string; toolId: string; quantity: number };

function RecipeForm() {
  const { id } = Route.useSearch();
  const db = useDb();
  const nav = useNavigate();
  const existing = id ? getDb().recipe.find((r) => r.id === id) : undefined;
  const init = getDb();
  const [productId, setProductId] = useState(existing?.productId ?? init.product[0]?.id ?? "");
  const [version, setVersion] = useState(existing?.version ?? "1.0");
  const [difficulty, setDifficulty] = useState(existing?.difficultyLevel ?? 3);
  const [minutes, setMinutes] = useState(String(existing?.estimatedLaborMinutes ?? 60));
  const [steps, setSteps] = useState<string[]>(
    existing ? existing.preparationSteps.split("\n").filter(Boolean) : [""],
  );
  const [ings, setIngs] = useState<IngLine[]>(
    existing
      ? init.recipeIngredient
          .filter((x) => x.recipeId === existing.id)
          .map((x) => ({
            key: x.id,
            ingredientId: x.ingredientId,
            quantity: String(x.quantity),
            uomId: x.uomId,
            notes: x.notes ?? "",
          }))
      : [],
  );
  const [tools, setTools] = useState<ToolLine[]>(
    existing
      ? init.recipeTool
          .filter((x) => x.recipeId === existing.id)
          .map((x) => ({ key: x.id, toolId: x.toolId, quantity: x.quantity }))
      : [],
  );
  const [complete, setComplete] = useState(existing?.isComplete ?? false);

  const compatibleUoms = (ingredientId: string) => {
    const ing = db.ingredient.find((i) => i.id === ingredientId);
    const type = db.uom.find((u) => u.id === ing?.purchaseUomId)?.type;
    return db.uom.filter((u) => u.type === type);
  };
  const validIngs = ings.filter((l) => l.ingredientId && Number(l.quantity) > 0);
  const stepText = steps
    .map((s) => s.trim())
    .filter(Boolean)
    .join("\n");
  const completable = canBeComplete(stepText, validIngs.length);

  let material = 0;
  for (const l of validIngs) {
    const ing = db.ingredient.find((i) => i.id === l.ingredientId);
    if (ing)
      material +=
        convert(db, Number(l.quantity), l.uomId, ing.purchaseUomId) * latestPrice(db, ing.id);
  }

  const save = () => {
    if (!productId) {
      toast.error("Pilih produk");
      return;
    }
    if (complete && !completable) {
      toast.error("Resep lengkap wajib punya bahan, jumlah, dan langkah");
      return;
    }
    try {
      const rid = mutate((d) => {
        const dup = d.recipe.find(
          (r) => r.productId === productId && r.version === version && r.id !== id,
        );
        if (dup) throw new Error(`Versi ${version} sudah ada untuk produk ini`);
        const rid = id ?? uid("r");
        const data = {
          productId,
          version,
          preparationSteps: stepText,
          difficultyLevel: difficulty,
          estimatedLaborMinutes: Number(minutes) || 0,
          isComplete: complete && completable,
          updatedAt: nowIso(),
        };
        const r = d.recipe.find((x) => x.id === rid);
        if (r) Object.assign(r, data);
        else d.recipe.push({ id: rid, createdAt: nowIso(), ...data });
        d.recipeIngredient = d.recipeIngredient
          .filter((x) => x.recipeId !== rid)
          .concat(
            validIngs.map((l) => ({
              id: uid("ri"),
              recipeId: rid,
              ingredientId: l.ingredientId,
              quantity: Number(l.quantity),
              uomId: l.uomId,
              notes: l.notes || null,
            })),
          );
        d.recipeTool = d.recipeTool
          .filter((x) => x.recipeId !== rid)
          .concat(
            tools
              .filter((t) => t.toolId)
              .map((t) => ({
                id: uid("rt"),
                recipeId: rid,
                toolId: t.toolId,
                quantity: t.quantity,
              })),
          );
        return rid;
      });
      toast.success("Resep disimpan");
      nav({ to: "/recipes/$id", params: { id: rid }, replace: true });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const remove = () => {
    if (!id || !confirm("Hapus resep ini?")) return;
    if (db.production.some((p) => p.recipeId === id)) {
      toast.error("Resep sudah dipakai produksi, tidak bisa dihapus");
      return;
    }
    mutate((d) => {
      d.recipe = d.recipe.filter((r) => r.id !== id);
      d.recipeIngredient = d.recipeIngredient.filter((x) => x.recipeId !== id);
      d.recipeTool = d.recipeTool.filter((x) => x.recipeId !== id);
    });
    toast.success("Resep dihapus");
    nav({ to: "/kitchen", search: { tab: "resep" }, replace: true });
  };

  return (
    <AppShell
      back
      adminOnly
      title={existing ? "Edit resep" : "Resep baru"}
      bottomBar={
        <Button className="w-full py-4" onClick={save}>
          Simpan resep
        </Button>
      }
    >
      {() => (
        <div className="space-y-5 pb-6">
          <Field label="Produk">
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className={inputCls}
            >
              {db.product.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Versi">
              <input
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Waktu kerja (menit)">
              <input
                type="number"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>
          <Field label={`Tingkat kesulitan: ${difficulty}/5`}>
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  type="button"
                  key={n}
                  onClick={() => setDifficulty(n)}
                  className={`rounded-xl border py-2.5 text-sm font-semibold ${n <= difficulty ? "border-accent bg-accent text-accent-foreground" : "bg-card"}`}
                >
                  {n}
                </button>
              ))}
            </div>
          </Field>

          <SectionTitle
            action={
              <button
                onClick={() => {
                  const first = db.ingredient[0];
                  setIngs([
                    ...ings,
                    {
                      key: uid("l"),
                      ingredientId: first?.id ?? "",
                      quantity: "",
                      uomId: compatibleUoms(first?.id ?? "")[0]?.id ?? "g",
                      notes: "",
                    },
                  ]);
                }}
                className="flex items-center gap-1 text-sm font-medium text-accent"
              >
                <Plus className="h-4 w-4" />
                Bahan
              </button>
            }
          >
            Bahan
          </SectionTitle>
          <div className="-mt-2 space-y-2.5">
            {ings.length === 0 && <p className="text-sm text-muted-foreground">Belum ada bahan.</p>}
            {ings.map((l) => (
              <Card key={l.key} className="space-y-2.5 p-3">
                <div className="flex gap-2">
                  <select
                    value={l.ingredientId}
                    className={`${inputCls} flex-1`}
                    onChange={(e) =>
                      setIngs(
                        ings.map((x) =>
                          x.key === l.key
                            ? {
                                ...x,
                                ingredientId: e.target.value,
                                uomId: compatibleUoms(e.target.value)[0]?.id ?? x.uomId,
                              }
                            : x,
                        ),
                      )
                    }
                  >
                    {db.ingredient.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => setIngs(ings.filter((x) => x.key !== l.key))}
                    className="px-2"
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Jumlah"
                    value={l.quantity}
                    onChange={(e) =>
                      setIngs(
                        ings.map((x) => (x.key === l.key ? { ...x, quantity: e.target.value } : x)),
                      )
                    }
                    className={`${inputCls} flex-1`}
                  />
                  <select
                    value={l.uomId}
                    onChange={(e) =>
                      setIngs(
                        ings.map((x) => (x.key === l.key ? { ...x, uomId: e.target.value } : x)),
                      )
                    }
                    className={`${inputCls} flex-1`}
                  >
                    {compatibleUoms(l.ingredientId).map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.symbol}
                      </option>
                    ))}
                  </select>
                </div>
                <input
                  placeholder="Catatan (opsional)"
                  value={l.notes}
                  onChange={(e) =>
                    setIngs(
                      ings.map((x) => (x.key === l.key ? { ...x, notes: e.target.value } : x)),
                    )
                  }
                  className={inputCls}
                />
              </Card>
            ))}
          </div>

          <SectionTitle
            action={
              <button
                onClick={() => setSteps([...steps, ""])}
                className="flex items-center gap-1 text-sm font-medium text-accent"
              >
                <Plus className="h-4 w-4" />
                Langkah
              </button>
            }
          >
            Langkah
          </SectionTitle>
          <div className="-mt-2 space-y-2">
            {steps.map((s, i) => (
              <div key={i} className="flex gap-2">
                <span className="mt-3 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                  {i + 1}
                </span>
                <textarea
                  rows={2}
                  value={s}
                  onChange={(e) => setSteps(steps.map((x, j) => (j === i ? e.target.value : x)))}
                  className={`${inputCls} flex-1`}
                  placeholder="Tulis langkah…"
                />
                <button onClick={() => setSteps(steps.filter((_, j) => j !== i))} className="px-1">
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            ))}
          </div>

          <SectionTitle
            action={
              <button
                onClick={() =>
                  setTools([...tools, { key: uid("t"), toolId: db.tool[0]?.id ?? "", quantity: 1 }])
                }
                className="flex items-center gap-1 text-sm font-medium text-accent"
              >
                <Plus className="h-4 w-4" />
                Alat
              </button>
            }
          >
            Alat
          </SectionTitle>
          <div className="-mt-2 space-y-2">
            {tools.map((t) => (
              <div key={t.key} className="flex gap-2">
                <select
                  value={t.toolId}
                  onChange={(e) =>
                    setTools(
                      tools.map((x) => (x.key === t.key ? { ...x, toolId: e.target.value } : x)),
                    )
                  }
                  className={`${inputCls} flex-3`}
                >
                  {db.tool.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  value={t.quantity}
                  onChange={(e) =>
                    setTools(
                      tools.map((x) =>
                        x.key === t.key ? { ...x, quantity: Number(e.target.value) } : x,
                      ),
                    )
                  }
                  className={`${inputCls} flex-1 text=center`}
                />
                <button
                  onClick={() => setTools(tools.filter((x) => x.key !== t.key))}
                  className="px-1"
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            ))}
          </div>

          <Card className="space-y-1 bg-secondary/50">
            <p className="text-xs text-muted-foreground">Perkiraan biaya</p>
            <p className="text-sm">
              Bahan {rupiah(material)} · Tenaga{" "}
              {rupiah(((Number(minutes) || 0) / 60) * currentLaborRate(db))}
            </p>
          </Card>

          <label
            className={`flex items-center justify-between rounded-xl border bg-card p-4 ${completable ? "" : "opacity-60"}`}
          >
            <span>
              <span className="block text-sm font-semibold">Tandai resep lengkap</span>
              <span className="text-xs text-muted-foreground">
                {completable ? "Siap dipakai produksi" : "Isi bahan & langkah dulu"}
              </span>
            </span>
            <input
              type="checkbox"
              checked={complete && completable}
              disabled={!completable}
              onChange={(e) => setComplete(e.target.checked)}
              className="h-5 w-5 accent-[var(--accent)]"
            />
          </label>

          {existing && (
            <button onClick={remove} className="w-full py-2 text-sm text-destructive">
              Hapus resep
            </button>
          )}
        </div>
      )}
    </AppShell>
  );
}
