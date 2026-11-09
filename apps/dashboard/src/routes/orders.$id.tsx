import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Copy, Flag, Phone, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell, Badge, Button, Card, Field, Row, SectionTitle, Sheet, inputCls, meta } from "@/components/app-shell";
import { dateFmt, dateTimeFmt, decorationLabel, orderStatusLabel, orderStatusTone, paymentStatusLabel, rupiah, sizeLabel } from "@/lib/db/labels";
import { nextStatus, nowIso, setOrderStatus, today, uid } from "@/lib/db/logic";
import { mutate, useDb } from "@/lib/db/store";
import type { NegotiationStatus } from "@/lib/db/types";

export const Route = createFileRoute("/orders/$id")({
  head: () => meta("Detail Pesanan — Cakeshop Manager", "Detail pesanan, riwayat status, pembayaran, dan link tracking."),
  component: OrderDetail,
});

const negotiationLabel: Record<NegotiationStatus, string> = { accepted: "Diterima", negotiated_down: "Ditawar turun", negotiated_no_change: "Ditawar, tetap", cancelled_due_to_price: "Batal karena harga" };

function OrderDetail() {
  const { id } = Route.useParams();
  const db = useDb();
  const order = db.customerOrder.find((o) => o.id === id);
  const [paySheet, setPaySheet] = useState(false);
  const [priceSheet, setPriceSheet] = useState(false);
  const [pay, setPay] = useState({ amount: "", method: "Transfer BCA" });
  const [finalTotal, setFinalTotal] = useState("");
  const [neg, setNeg] = useState<NegotiationStatus>("accepted");
  const [note, setNote] = useState("");

  if (!order) return <AppShell back title="Tidak ditemukan">{() => <p className="text-sm text-muted-foreground">Pesanan tidak ada.</p>}</AppShell>;

  const customer = db.customer.find((c) => c.id === order.customerId);
  const items = db.orderItem.filter((i) => i.orderId === id);
  const history = db.orderStatusHistory.filter((h) => h.orderId === id).sort((a, b) => a.changedAt.localeCompare(b.changedAt));
  const review = db.orderReview.find((r) => r.orderId === id && r.status === "pending");
  const payments = db.payment.filter((p) => p.orderId === id);
  const paid = payments.filter((p) => p.status === "verified").reduce((s, p) => s + p.amount, 0);
  const next = nextStatus(order.status);
  const closed = ["completed", "cancelled_no_response", "cancelled_other"].includes(order.status);
  const userName = (uidv: string | null) => (uidv ? db.user.find((u) => u.id === uidv)?.name.split(" ")[0] : "Sistem");

  const run = (fn: () => void, msg: string) => { try { fn(); toast.success(msg); } catch (e) { toast.error((e as Error).message); } };

  return (
    <AppShell back
      bottomBar={!closed && next && order.status !== "requires_review" ? (
        <Button className="w-full py-4" onClick={() => run(() => mutate((d) => setOrderStatus(d, id, next, d.session?.userId ?? null)), `Status → ${orderStatusLabel[next]}. Notifikasi dikirim ke pelanggan.`)}>
          Ubah ke "{orderStatusLabel[next]}"
        </Button>
      ) : undefined}>
      {(user) => {
        const isAdmin = user.role === "admin";
        return (
          <div className="pb-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground">{order.orderNumber} · {order.sourceChannel}</p>
                <h1 className="font-display text-3xl font-semibold">{customer?.name}</h1>
                <p className="text-sm text-muted-foreground">Ambil {dateFmt(order.fulfillmentDate, { weekday: "short", day: "numeric", month: "short" })}{order.fulfillmentTime ? `, ${order.fulfillmentTime}` : ""}</p>
              </div>
              <Badge tone={orderStatusTone[order.status]}>{orderStatusLabel[order.status]}</Badge>
            </div>

            {review && (
              <Card className="mt-4 border-destructive/30 bg-destructive/5">
                <p className="flex items-center gap-2 text-sm font-semibold text-destructive"><Flag className="h-4 w-4" />Perlu review</p>
                <p className="mt-1 text-sm">{review.reason}</p>
                {isAdmin ? (
                  <>
                    <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Catatan (opsional)" className={`${inputCls} mt-3`} />
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <Button variant="danger" onClick={() => run(() => mutate((d) => {
                        const r = d.orderReview.find((x) => x.id === review.id)!;
                        Object.assign(r, { status: "rejected", reviewedBy: d.session?.userId ?? null, reviewedAt: nowIso(), notes: note || null });
                        setOrderStatus(d, id, "cancelled_other", d.session?.userId ?? null);
                      }), "Pesanan ditolak")}><X className="h-4 w-4" />Tolak</Button>
                      <Button onClick={() => run(() => mutate((d) => {
                        const r = d.orderReview.find((x) => x.id === review.id)!;
                        Object.assign(r, { status: "approved", reviewedBy: d.session?.userId ?? null, reviewedAt: nowIso(), notes: note || null });
                        setOrderStatus(d, id, "confirmed", d.session?.userId ?? null);
                      }), "Disetujui & dikonfirmasi")}><Check className="h-4 w-4" />Setujui</Button>
                    </div>
                  </>
                ) : <p className="mt-2 text-xs text-muted-foreground">Menunggu persetujuan pemilik.</p>}
              </Card>
            )}

            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <a href={`tel:${customer?.phone ?? ""}`} className="flex items-center justify-center gap-2 rounded-xl border bg-card py-3 text-sm font-medium"><Phone className="h-4 w-4" />Hubungi</a>
              <button onClick={() => { navigator.clipboard?.writeText(`${location.origin}/track/${order.trackingToken}`); toast.success("Link tracking disalin"); }}
                className="flex items-center justify-center gap-2 rounded-xl border bg-card py-3 text-sm font-medium"><Copy className="h-4 w-4" />Link tracking</button>
            </div>

            <SectionTitle>Item</SectionTitle>
            <div className="space-y-2.5">
              {items.map((i) => {
                const p = db.product.find((x) => x.id === i.productId);
                return (
                  <Card key={i.id} className="space-y-1.5">
                    <div className="flex justify-between gap-3"><p className="font-semibold">{i.quantity}× {p?.name}</p>{isAdmin && <p className="text-sm font-medium">{rupiah(i.subtotal)}</p>}</div>
                    {(i.sizePortion || i.tierCount || i.decorationType !== "none") && (
                      <p className="text-xs text-muted-foreground">
                        {[i.sizePortion && sizeLabel[i.sizePortion], i.tierCount && `${i.tierCount} tier`, i.decorationType !== "none" && decorationLabel[i.decorationType]].filter(Boolean).join(" · ")}
                      </p>
                    )}
                    {i.customization && <p className="rounded-lg bg-muted px-3 py-2 text-sm">“{i.customization}”</p>}
                    {isAdmin && i.statedBudget != null && <p className="text-xs text-muted-foreground">Budget pelanggan {rupiah(i.statedBudget)}</p>}
                  </Card>
                );
              })}
            </div>
            {order.deliveryAddress && <p className="mt-3 text-sm text-muted-foreground">📍 {order.deliveryAddress}</p>}

            {isAdmin && (
              <>
                <SectionTitle action={!closed && <button onClick={() => { setFinalTotal(String(order.total)); setPriceSheet(true); }} className="text-sm font-medium text-accent">Negosiasi</button>}>Harga</SectionTitle>
                <Card className="space-y-2">
                  {order.quotedTotal != null && order.quotedTotal !== order.total && <Row l="Penawaran awal" v={<s>{rupiah(order.quotedTotal)}</s>} />}
                  <Row l="Total disepakati" v={rupiah(order.total)} bold />
                  <Row l="Status negosiasi" v={order.negotiationStatus ? negotiationLabel[order.negotiationStatus] : "Belum final"} />
                  <Row l="Terbayar" v={rupiah(paid)} />
                  <Row l="Sisa" v={rupiah(Math.max(0, order.total - paid))} bold />
                </Card>

                <SectionTitle action={<button onClick={() => setPaySheet(true)} className="text-sm font-medium text-accent">+ Bayar</button>}>Pembayaran</SectionTitle>
                <div className="space-y-2">
                  {payments.length === 0 && <p className="text-sm text-muted-foreground">Belum ada pembayaran.</p>}
                  {payments.map((p) => (
                    <Card key={p.id} className="flex items-center gap-3 py-3">
                      <div className="flex-1"><p className="text-sm font-semibold">{rupiah(p.amount)}</p><p className="text-xs text-muted-foreground">{p.paymentMethod} · {p.paidAt ? dateTimeFmt(p.paidAt) : "-"}</p></div>
                      {p.status === "pending" ? (
                        <Button variant="outline" className="px-3 py-2 text-xs" onClick={() => run(() => mutate((d) => {
                          const x = d.payment.find((y) => y.id === p.id)!; x.status = "verified";
                          d.financialTransaction.push({ id: uid("ft"), orderId: id, type: "income", category: "sales", amount: p.amount, transactionDate: today(), description: `Pembayaran ${order.orderNumber}`, createdAt: nowIso() });
                        }), "Pembayaran diverifikasi & dicatat sebagai pemasukan")}>Verifikasi</Button>
                      ) : <Badge tone={p.status === "verified" ? "bg-success/15 text-success" : "bg-destructive/10 text-destructive"}>{paymentStatusLabel[p.status]}</Badge>}
                    </Card>
                  ))}
                </div>
              </>
            )}

            <SectionTitle>Riwayat status</SectionTitle>
            <ol className="relative ml-2 space-y-4 border-l-2 border-border pl-5">
              {history.map((h, i) => (
                <li key={h.id} className="relative">
                  <span className={`absolute -left-[27px] top-1 h-3 w-3 rounded-full ${i === history.length - 1 ? "bg-accent" : "bg-primary"}`} />
                  <p className="text-sm font-semibold">{orderStatusLabel[h.newStatus]}</p>
                  <p className="text-xs text-muted-foreground">{dateTimeFmt(h.changedAt)} · {userName(h.changedBy)}</p>
                </li>
              ))}
            </ol>

            {!closed && (
              <button className="mt-6 w-full text-center text-sm text-destructive" onClick={() => {
                if (confirm("Batalkan pesanan ini?")) run(() => mutate((d) => setOrderStatus(d, id, "cancelled_other", d.session?.userId ?? null)), "Pesanan dibatalkan");
              }}>Batalkan pesanan</button>
            )}
            <Link to="/track/$token" params={{ token: order.trackingToken }} className="mt-4 block text-center text-sm text-accent underline">Lihat halaman pelanggan</Link>

            <Sheet open={paySheet} onClose={() => setPaySheet(false)} title="Catat pembayaran">
              <div className="space-y-4">
                <Field label="Jumlah"><input type="number" value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} className={inputCls} placeholder={String(Math.max(0, order.total - paid))} /></Field>
                <Field label="Metode">
                  <select value={pay.method} onChange={(e) => setPay({ ...pay, method: e.target.value })} className={inputCls}>
                    {["Transfer BCA", "QRIS", "Tunai", "E-wallet"].map((m) => <option key={m}>{m}</option>)}
                  </select>
                </Field>
                <Button className="w-full" onClick={() => {
                  const amt = Number(pay.amount || Math.max(0, order.total - paid));
                  if (amt <= 0) { toast.error("Jumlah harus lebih dari 0"); return; }
                  run(() => mutate((d) => { d.payment.push({ id: uid("pay"), orderId: id, amount: amt, paymentMethod: pay.method, status: "pending", paidAt: nowIso(), createdAt: nowIso() }); }), "Pembayaran dicatat, menunggu verifikasi");
                  setPaySheet(false); setPay({ amount: "", method: "Transfer BCA" });
                }}>Simpan</Button>
              </div>
            </Sheet>

            <Sheet open={priceSheet} onClose={() => setPriceSheet(false)} title="Hasil negosiasi">
              <div className="space-y-4">
                <Field label="Total disepakati"><input type="number" value={finalTotal} onChange={(e) => setFinalTotal(e.target.value)} className={inputCls} /></Field>
                <Field label="Status">
                  <select value={neg} onChange={(e) => setNeg(e.target.value as NegotiationStatus)} className={inputCls}>
                    {(Object.keys(negotiationLabel) as NegotiationStatus[]).map((k) => <option key={k} value={k}>{negotiationLabel[k]}</option>)}
                  </select>
                </Field>
                <Button className="w-full" onClick={() => {
                  run(() => mutate((d) => {
                    const o = d.customerOrder.find((x) => x.id === id)!;
                    o.total = Number(finalTotal); o.negotiationStatus = neg;
                    if (neg === "cancelled_due_to_price") setOrderStatus(d, id, "cancelled_other", d.session?.userId ?? null);
                  }), "Harga diperbarui");
                  setPriceSheet(false);
                }}>Simpan</Button>
              </div>
            </Sheet>
          </div>
        );
      }}
    </AppShell>
  );
}
