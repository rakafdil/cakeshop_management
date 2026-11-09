import { createFileRoute, Link } from "@tanstack/react-router";
import { Pencil, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  AppShell,
  Badge,
  Button,
  Card,
  Field,
  SectionTitle,
  Sheet,
  inputCls,
  meta,
} from "@/components/app-shell";
import { dateTimeFmt, qtyFmt, rupiah } from "@/lib/db/labels";
import { ingredientsApi, uomsApi } from "@/lib/endpoints/ingredients";
import type { IngredientPriceHistory } from "@/lib/db/types";

export const Route = createFileRoute("/inventory/$id")({
  head: () =>
    meta("Bahan Baku — Cakeshop Manager", "Stok, riwayat mutasi, dan riwayat harga bahan baku."),
  component: IngredientDetail,
});

function IngredientDetail() {
  const { id } = Route.useParams();
  const [ingredient, setIngredient] =
    useState<Awaited<ReturnType<typeof ingredientsApi.get>>>();
  const [uom, setUom] = useState("");
  const [price, setPrice] = useState("");
  const [sheet, setSheet] = useState<"price" | null>(null);
  const [apiPrices, setApiPrices] = useState<IngredientPriceHistory[]>([]);
  const [loadError, setLoadError] = useState<string>();
  const [deleting, setDeleting] = useState(false);
  const nav = Route.useNavigate();
  useEffect(() => {
    Promise.all([ingredientsApi.get(id), uomsApi.list(), ingredientsApi.priceHistory(id, { pageSize: 100 })])
      .then(([item, uoms, history]) => {
        setIngredient(item);
        setUom(uoms.data.find((itemUom) => itemUom.id === item.purchaseUomId)?.symbol ?? "");
        setApiPrices(history.data.map((itemPrice) => ({
          id: itemPrice.id,
          ingredientId: itemPrice.ingredientId,
          price: Number(itemPrice.price),
          previousPrice: itemPrice.previousPrice == null ? null : Number(itemPrice.previousPrice),
          changedAt: String(itemPrice.changedAt),
        })));
        const latest = history.data[0];
        if (latest) setPrice(latest.price);
      })
      .catch((error) => {
        setLoadError(error instanceof Error ? error.message : "Gagal memuat bahan");
      });
  }, [id]);
  if (loadError)
    return (
      <AppShell back title="Bahan gagal dimuat">
        {() => <p className="text-sm text-destructive">{loadError}</p>}
      </AppShell>
    );
  if (!ingredient)
    return (
      <AppShell back title="Memuat bahan...">
        {() => null}
      </AppShell>
    );
  const low = Number(ingredient.currentStock) < Number(ingredient.minimumStock);

  return (
    <AppShell back>
      {(user) => {
        const isAdmin = user.role === "admin";
        return (
          <div className="pb-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="font-display text-3xl font-semibold">{ingredient.name}</h1>
              </div>
              {isAdmin && (
                <div className="flex gap-2">
                  <Link to="/inventory/form" search={{ id }} className="rounded-full border p-2.5">
                    <Pencil className="h-4 w-4" />
                  </Link>
                  <Button
                    variant="danger"
                    className="rounded-full p-2.5"
                    disabled={deleting}
                    aria-label="Hapus bahan"
                    onClick={async () => {
                      if (!confirm(`Hapus bahan "${ingredient.name}"?`)) return;
                      setDeleting(true);
                      try {
                        await ingredientsApi.remove(id);
                        toast.success("Bahan dihapus");
                        nav({ to: "/kitchen", search: { tab: "inventori" }, replace: true });
                      } catch (error) {
                        toast.error(
                          error instanceof Error ? error.message : "Bahan gagal dihapus",
                        );
                      } finally {
                        setDeleting(false);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            <Card className={`mt-4 ${low ? "border-destructive/40 bg-destructive/5" : ""}`}>
              <p className="text-xs text-muted-foreground">Stok saat ini</p>
              <p className={`font-display text-4xl font-semibold ${low ? "text-destructive" : ""}`}>
                {qtyFmt(Number(ingredient.currentStock))}{" "}
                <span className="text-base font-normal text-muted-foreground">{uom}</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Minimum {qtyFmt(Number(ingredient.minimumStock))} {uom}
                {low && " · di bawah minimum!"}
              </p>
              {isAdmin && (
                <p className="mt-2 text-sm">
                  Harga terakhir                   <b>{rupiah(apiPrices[0]?.price ?? 0)}</b>/{uom}
                </p>
              )}
            </Card>

            <div className={`mt-3 grid gap-2.5 ${isAdmin ? "grid-cols-2" : "grid-cols-1"}`}>
              {isAdmin && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setPrice(String(apiPrices[0]?.price ?? ""));
                    setSheet("price");
                  }}
                >
                  Update harga
                </Button>
              )}
            </div>

            {isAdmin && (
              <>
                <SectionTitle>Riwayat harga</SectionTitle>
                <Card className="divide-y p-0">
                  {apiPrices.map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-3.5 text-sm">
                      <span className="text-muted-foreground">{dateTimeFmt(p.changedAt)}</span>
                      <span>
                        {p.previousPrice != null && (
                          <span className="mr-2 text-xs text-muted-foreground line-through">
                            {rupiah(p.previousPrice)}
                          </span>
                        )}
                        <b>{rupiah(p.price)}</b>
                        {p.previousPrice != null && (
                          <Badge
                            tone={
                              p.price > p.previousPrice
                                ? "ml-2 bg-destructive/10 text-destructive"
                                : "ml-2 bg-success/15 text-success"
                            }
                          >
                            {p.price > p.previousPrice ? "▲" : "▼"}
                          </Badge>
                        )}
                      </span>
                    </div>
                  ))}
                </Card>
              </>
            )}

            <Sheet
              open={sheet === "price"}
              onClose={() => setSheet(null)}
              title="Update harga beli"
            >
              <div className="space-y-4">
                <Field
                  label={`Harga per ${uom}`}
                  hint="HPP semua resep yang memakai bahan ini akan otomatis dihitung ulang."
                >
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className={inputCls}
                  />
                </Field>
                <Button
                  className="w-full"
                  onClick={async () => {
                    const n = Number(price);
                    if (!(n >= 0)) {
                      toast.error("Harga tidak valid");
                      return;
                    }
                    try {
                      const created = await ingredientsApi.addPrice(id, { price: String(n) });
                      setApiPrices((current) => [
                        {
                          id: created.id,
                          ingredientId: created.ingredientId,
                          price: Number(created.price),
                          previousPrice:
                            created.previousPrice == null ? null : Number(created.previousPrice),
                          changedAt: String(created.changedAt),
                        },
                        ...current,
                      ]);
                      toast.success("Harga diperbarui");
                      setSheet(null);
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : "Harga gagal diperbarui");
                    }
                  }}
                >
                  Simpan
                </Button>
              </div>
            </Sheet>
          </div>
        );
      }}
    </AppShell>
  );
}
