import { createFileRoute } from "@tanstack/react-router";
import { ArrowDownLeft, ArrowUpRight, Download, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell, Button, Card, Chip, Field, Row, SectionTitle, Sheet, inputCls, meta } from "@/components/app-shell";
import { dateFmt, financeCategoryLabel, rupiah } from "@/lib/db/labels";
import { activeRecipe, nowIso, recipeCost, recommendedPrice, targetMargin, today, uid } from "@/lib/db/logic";
import { mutate, useDb } from "@/lib/db/store";
import type { FinancialTransactionType } from "@/lib/db/types";

export const Route = createFileRoute("/finance")({
  head: () => meta("Keuangan — Cakeshop Manager", "Arus kas, laba rugi, HPP, dan rekomendasi harga jual."),
  component: Finance,
});

type Range = "7" | "30" | "all";

function Finance() {
  const db = useDb();
  const [range, setRange] = useState<Range>("30");
  const [open, setOpen] = useState(false);
  const [tx, setTx] = useState({ type: "expense" as FinancialTransactionType, category: "ingredients", amount: "", date: today(), description: "" });

  const from = range === "all" ? "" : new Date(Date.now() - Number(range) * 864e5).toISOString().slice(0, 10);
  const list = db.financialTransaction.filter((t) => t.transactionDate >= from).sort((a, b) => b.transactionDate.localeCompare(a.transactionDate) || b.createdAt.localeCompare(a.createdAt));
  const income = list.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expense = list.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const byCat = Object.entries(list.filter((t) => t.type === "expense").reduce<Record<string, number>>((m, t) => ({ ...m, [t.category]: (m[t.category] ?? 0) + t.amount }), {})).sort((a, b) => b[1] - a[1]);

  const sold = db.product.map((p) => ({
    p, qty: db.orderItem.filter((i) => i.productId === p.id && !db.customerOrder.find((o) => o.id === i.orderId)?.status.startsWith("cancelled")).reduce((s, i) => s + i.quantity, 0),
  })).sort((a, b) => b.qty - a.qty);

  return (
    <AppShell adminOnly title="Keuangan" subtitle="Arus kas & HPP"
      action={<button onClick={() => toast("Ekspor PDF/Excel akan tersedia setelah tersambung ke server")} className="rounded-full border bg-card p-2.5" aria-label="Ekspor"><Download className="h-4 w-4" /></button>}>
      {() => (
        <>
          <div className="flex gap-2">{([["7", "7 hari"], ["30", "30 hari"], ["all", "Semua"]] as const).map(([k, l]) => <Chip key={k} active={range === k} onClick={() => setRange(k)}>{l}</Chip>)}</div>

          <div className="mt-4 rounded-3xl bg-hero p-5 text-primary-foreground">
            <p className="text-sm opacity-80">Laba/rugi</p>
            <p className="mt-1 font-display text-4xl font-semibold">{rupiah(income - expense)}</p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl bg-primary-foreground/10 p-3"><p className="opacity-75">Pemasukan</p><p className="font-semibold">{rupiah(income)}</p></div>
              <div className="rounded-2xl bg-primary-foreground/10 p-3"><p className="opacity-75">Pengeluaran</p><p className="font-semibold">{rupiah(expense)}</p></div>
            </div>
          </div>

          <Button variant="accent" className="mt-3 w-full" onClick={() => setOpen(true)}><Plus className="h-4 w-4" />Catat transaksi</Button>

          {byCat.length > 0 && (
            <>
              <SectionTitle>Pengeluaran per kategori</SectionTitle>
              <Card className="space-y-3">
                {byCat.map(([c, v]) => (
                  <div key={c}>
                    <Row l={financeCategoryLabel[c] ?? c} v={rupiah(v)} />
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-accent" style={{ width: `${(v / expense) * 100}%` }} /></div>
                  </div>
                ))}
              </Card>
            </>
          )}

          <SectionTitle>HPP & harga per produk</SectionTitle>
          <div className="space-y-2">
            {db.product.filter((p) => p.isActive).map((p) => {
              const r = activeRecipe(db, p.id);
              const c = r ? recipeCost(db, r.id) : null;
              const rec = c ? recommendedPrice(c.hpp, targetMargin(db, p.id)) : null;
              return (
                <Card key={p.id} className="py-3">
                  <div className="flex justify-between"><p className="text-sm font-semibold">{p.name}</p><p className="text-sm">{rupiah(p.basePrice)}</p></div>
                  {c && rec != null ? (
                    <p className="mt-1 text-xs text-muted-foreground">HPP {rupiah(c.hpp)} · min {rupiah(rec)} · margin {Math.round(((p.basePrice - c.hpp) / p.basePrice) * 100)}% {p.basePrice < rec && <span className="font-semibold text-destructive">· di bawah rekomendasi</span>}</p>
                  ) : <p className="mt-1 text-xs text-muted-foreground">Belum ada resep</p>}
                </Card>
              );
            })}
          </div>

          <SectionTitle>Terlaris</SectionTitle>
          <Card className="divide-y p-0">
            {sold.slice(0, 5).map(({ p, qty }, i) => (
              <div key={p.id} className="flex items-center gap-3 p-3.5 text-sm">
                <span className="w-4 font-display text-muted-foreground">{i + 1}</span>
                <span className="flex-1">{p.name}</span>
                <span className="font-semibold">{qty} pcs</span>
              </div>
            ))}
          </Card>

          <SectionTitle>Transaksi</SectionTitle>
          <Card className="divide-y p-0">
            {list.length === 0 && <p className="p-4 text-sm text-muted-foreground">Tidak ada transaksi.</p>}
            {list.map((t) => (
              <div key={t.id} className="flex items-center gap-3 p-3.5">
                <div className={`flex h-9 w-9 items-center justify-center rounded-full ${t.type === "income" ? "bg-success/15 text-success" : "bg-destructive/10 text-destructive"}`}>
                  {t.type === "income" ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{t.description ?? "-"}</p><p className="text-xs text-muted-foreground">{financeCategoryLabel[t.category] ?? t.category} · {dateFmt(t.transactionDate)}</p></div>
                <span className={`text-sm font-semibold ${t.type === "income" ? "text-success" : ""}`}>{t.type === "income" ? "+" : "−"}{rupiah(t.amount)}</span>
              </div>
            ))}
          </Card>

          <Sheet open={open} onClose={() => setOpen(false)} title="Catat transaksi">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <Chip active={tx.type === "income"} onClick={() => setTx({ ...tx, type: "income", category: "sales" })}>Pemasukan</Chip>
                <Chip active={tx.type === "expense"} onClick={() => setTx({ ...tx, type: "expense", category: "ingredients" })}>Pengeluaran</Chip>
              </div>
              <Field label="Kategori">
                <select value={tx.category} onChange={(e) => setTx({ ...tx, category: e.target.value })} className={inputCls}>
                  {Object.entries(financeCategoryLabel).filter(([k]) => (tx.type === "income" ? ["sales", "other"].includes(k) : k !== "sales")).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Jumlah"><input type="number" value={tx.amount} onChange={(e) => setTx({ ...tx, amount: e.target.value })} className={inputCls} /></Field>
                <Field label="Tanggal"><input type="date" value={tx.date} onChange={(e) => setTx({ ...tx, date: e.target.value })} className={inputCls} /></Field>
              </div>
              <Field label="Keterangan"><input value={tx.description} onChange={(e) => setTx({ ...tx, description: e.target.value })} className={inputCls} /></Field>
              <Button className="w-full" onClick={() => {
                if (!(Number(tx.amount) > 0) || !tx.date || !tx.category) { toast.error("Kategori, jumlah, dan tanggal wajib diisi"); return; }
                mutate((d) => { d.financialTransaction.push({ id: uid("ft"), orderId: null, type: tx.type, category: tx.category, amount: Number(tx.amount), transactionDate: tx.date, description: tx.description || null, createdAt: nowIso() }); });
                toast.success("Transaksi dicatat"); setOpen(false); setTx({ ...tx, amount: "", description: "" });
              }}>Simpan</Button>
            </div>
          </Sheet>
        </>
      )}
    </AppShell>
  );
}
