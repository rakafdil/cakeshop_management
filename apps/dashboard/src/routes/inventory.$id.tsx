import { createFileRoute, Link } from "@tanstack/react-router";
import { Pencil } from "lucide-react";
import { useState } from "react";
import { useEffect } from "react";
import { toast } from "sonner";
import {
  AppShell,
  Badge,
  Button,
  Card,
  Chip,
  Field,
  SectionTitle,
  Sheet,
  inputCls,
  meta,
} from "@/components/app-shell";
import { dateTimeFmt, qtyFmt, rupiah, stockTxLabel } from "@/lib/db/labels";
import { applyStock, latestPrice, nowIso, uid } from "@/lib/db/logic";
import { mutate, useDb } from "@/lib/db/store";
import { ingredientsApi } from "@/lib/endpoints/ingredients";
import type { IngredientPriceHistory } from "@/lib/db/types";
import type { StockTransactionType } from "@/lib/db/types";

export const Route = createFileRoute("/inventory/$id")({
  head: () =>
    meta("Bahan Baku — Cakeshop Manager", "Stok, riwayat mutasi, dan riwayat harga bahan baku."),
  component: IngredientDetail,
});

const txTone: Record<StockTransactionType, string> = {
  in: "text-success",
  out: "text-foreground",
  waste: "text-destructive",
  adjustment: "text-accent",
};

function IngredientDetail() {
  const { id } = Route.useParams();
  const db = useDb();
  const [sheet, setSheet] = useState<null | "stock" | "price">(null);
  const [type, setType] = useState<StockTransactionType>("in");
  const [qty, setQty] = useState("");
  const [price, setPrice] = useState("");
  const [alsoExpense, setAlsoExpense] = useState(true);
  const [apiPrices, setApiPrices] = useState<IngredientPriceHistory[]>([]);
  const ing = db.ingredient.find((i) => i.id === id);
  if (!ing)
    return (
      <AppShell back title="Tidak ditemukan">
        {() => null}
      </AppShell>
    );
  const uom = db.uom.find((u) => u.id === ing.purchaseUomId)?.symbol ?? "";
  const txs = db.stockTransaction
    .filter((t) => t.ingredientId === id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const prices = db.ingredientPriceHistory
    .filter((p) => p.ingredientId === id)
    .sort((a, b) => b.changedAt.localeCompare(a.changedAt));
  useEffect(() => {
    ingredientsApi
      .priceHistory(id, { pageSize: 100 })
      .then((response) =>
        setApiPrices(
          response.data.map((item) => ({
            id: item.id,
            ingredientId: item.ingredientId,
            price: Number(item.price),
            previousPrice: item.previousPrice == null ? null : Number(item.previousPrice),
            changedAt: item.changedAt.toISOString(),
          })),
        ),
      )
      .catch(() => undefined);
  }, [id]);
  const displayedPrices = apiPrices.length > 0 ? apiPrices : prices;
  const low = ing.currentStock < ing.minimumStock;
  const usedIn = db.recipeIngredient.filter((r) => r.ingredientId === id).length;

  return (
    <AppShell back>
      {(user) => {
        const isAdmin = user.role === "admin";
        const types: StockTransactionType[] = isAdmin
          ? ["in", "out", "waste", "adjustment"]
          : ["in", "out", "waste"];
        return (
          <div className="pb-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="font-display text-3xl font-semibold">{ing.name}</h1>
                <p className="text-sm text-muted-foreground">Dipakai di {usedIn} resep</p>
              </div>
              {isAdmin && (
                <Link to="/inventory/form" search={{ id }} className="rounded-full border p-2.5">
                  <Pencil className="h-4 w-4" />
                </Link>
              )}
            </div>

            <Card className={`mt-4 ${low ? "border-destructive/40 bg-destructive/5" : ""}`}>
              <p className="text-xs text-muted-foreground">Stok saat ini</p>
              <p className={`font-display text-4xl font-semibold ${low ? "text-destructive" : ""}`}>
                {qtyFmt(ing.currentStock)}{" "}
                <span className="text-base font-normal text-muted-foreground">{uom}</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Minimum {qtyFmt(ing.minimumStock)} {uom}
                {low && " · di bawah minimum!"}
              </p>
              {isAdmin && (
                <p className="mt-2 text-sm">
                  Harga terakhir <b>{rupiah(latestPrice(db, id))}</b>/{uom}
                </p>
              )}
            </Card>

            <div className={`mt-3 grid gap-2.5 ${isAdmin ? "grid-cols-2" : "grid-cols-1"}`}>
              <Button
                onClick={() => {
                  setType("in");
                  setQty("");
                  setSheet("stock");
                }}
              >
                Catat mutasi stok
              </Button>
              {isAdmin && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setPrice(String(latestPrice(db, id)));
                    setSheet("price");
                  }}
                >
                  Update harga
                </Button>
              )}
            </div>

            <SectionTitle>Riwayat stok</SectionTitle>
            <Card className="divide-y p-0">
              {txs.length === 0 && (
                <p className="p-4 text-sm text-muted-foreground">Belum ada mutasi.</p>
              )}
              {txs.map((t) => (
                <div key={t.id} className="flex items-center gap-3 p-3.5">
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {stockTxLabel[t.transactionType]}
                      {t.productionId && (
                        <span className="text-xs text-muted-foreground"> · produksi</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">{dateTimeFmt(t.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${txTone[t.transactionType]}`}>
                      {t.transactionType === "in"
                        ? "+"
                        : t.transactionType === "adjustment"
                          ? "="
                          : "−"}
                      {qtyFmt(t.quantity)} {uom}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {qtyFmt(t.stockBefore)} → {qtyFmt(t.stockAfter)}
                    </p>
                  </div>
                </div>
              ))}
            </Card>

            {isAdmin && (
              <>
                <SectionTitle>Riwayat harga</SectionTitle>
                <Card className="divide-y p-0">
                  {displayedPrices.map((p) => (
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

            <Sheet open={sheet === "stock"} onClose={() => setSheet(null)} title="Mutasi stok">
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {types.map((t) => (
                    <Chip key={t} active={type === t} onClick={() => setType(t)}>
                      {stockTxLabel[t]}
                    </Chip>
                  ))}
                </div>
                <Field
                  label={
                    type === "adjustment" ? `Stok hasil hitung fisik (${uom})` : `Jumlah (${uom})`
                  }
                >
                  <input
                    type="number"
                    step="any"
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                    className={inputCls}
                    autoFocus
                  />
                </Field>
                {type === "in" && isAdmin && (
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={alsoExpense}
                      onChange={(e) => setAlsoExpense(e.target.checked)}
                      className="accent-[var(--accent)]"
                    />
                    Catat sebagai pengeluaran ({rupiah(Number(qty || 0) * latestPrice(db, id))})
                  </label>
                )}
                <Button
                  className="w-full"
                  onClick={() => {
                    const n = Number(qty);
                    if (!(n >= 0) || (type !== "adjustment" && n <= 0)) {
                      toast.error("Jumlah tidak valid");
                      return;
                    }
                    if ((type === "out" || type === "waste") && n > ing.currentStock) {
                      toast.error("Melebihi stok yang ada");
                      return;
                    }
                    mutate((d) => {
                      applyStock(d, id, type, n);
                      if (type === "in" && isAdmin && alsoExpense)
                        d.financialTransaction.push({
                          id: uid("ft"),
                          orderId: null,
                          type: "expense",
                          category: "ingredients",
                          amount: Math.round(n * latestPrice(d, id)),
                          transactionDate: nowIso().slice(0, 10),
                          description: `${ing.name} ${n}${uom}`,
                          createdAt: nowIso(),
                        });
                    });
                    toast.success("Stok diperbarui");
                    setSheet(null);
                  }}
                >
                  Simpan
                </Button>
              </div>
            </Sheet>

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
                  onClick={() => {
                    const n = Number(price);
                    if (!(n >= 0)) {
                      toast.error("Harga tidak valid");
                      return;
                    }
                    mutate((d) => {
                      d.ingredientPriceHistory.push({
                        id: uid("ph"),
                        ingredientId: id,
                        price: n,
                        previousPrice: latestPrice(d, id),
                        changedAt: nowIso(),
                      });
                    });
                    toast.success("Harga diperbarui");
                    setSheet(null);
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
