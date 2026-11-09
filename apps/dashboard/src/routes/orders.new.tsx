import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell, Button, Card, Chip, Field, SectionTitle, inputCls, meta } from "@/components/app-shell";
import { SOURCE_CHANNELS, decorationLabel, rupiah, sizeLabel } from "@/lib/db/labels";
import { nowIso, screeningReason, uid } from "@/lib/db/logic";
import { mutate, useDb } from "@/lib/db/store";
import type { DecorationType, OrderItem, SizePortion } from "@/lib/db/types";

export const Route = createFileRoute("/orders/new")({
  head: () => meta("Pesanan Baru — Cakeshop Manager", "Catat pesanan baru dari kanal mana pun."),
  component: NewOrder,
});

type Line = { key: string; productId: string; quantity: number; unitPrice: number; statedBudget: string; customization: string; decorationType: DecorationType; sizePortion: SizePortion | ""; tierCount: string };

function NewOrder() {
  const db = useDb();
  const nav = useNavigate();
  const products = db.product.filter((p) => p.isActive);
  const [customerMode, setCustomerMode] = useState<"existing" | "new">("existing");
  const [customerId, setCustomerId] = useState(db.customer[0]?.id ?? "");
  const [cust, setCust] = useState({ name: "", phone: "", email: "", address: "" });
  const [source, setSource] = useState("WhatsApp");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [address, setAddress] = useState("");
  const newLine = (): Line => ({ key: uid("l"), productId: products[0]?.id ?? "", quantity: 1, unitPrice: products[0]?.basePrice ?? 0, statedBudget: "", customization: "", decorationType: "none", sizePortion: "", tierCount: "" });
  const [lines, setLines] = useState<Line[]>([newLine()]);

  const upd = (key: string, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const computed = lines.map((l) => ({ ...l, subtotal: l.quantity * l.unitPrice, budget: l.statedBudget ? Number(l.statedBudget) : null }));
  const total = computed.reduce((s, l) => s + l.subtotal, 0);
  const reason = screeningReason(db, computed.map((l) => ({ productId: l.productId, subtotal: l.subtotal, statedBudget: l.budget })));

  const save = () => {
    try {
      const id = mutate((d) => {
        const userId = d.session?.userId ?? null;
        let cid = customerId;
        if (customerMode === "new") {
          if (!cust.name.trim()) throw new Error("Nama pelanggan wajib diisi");
          const existing = d.customer.find((c) => (cust.phone && c.phone === cust.phone) || (cust.email && c.email === cust.email));
          if (existing) cid = existing.id;
          else {
            cid = uid("c");
            d.customer.push({ id: cid, name: cust.name.trim(), phone: cust.phone || null, email: cust.email || null, address: cust.address || null, createdAt: nowIso() });
          }
        }
        if (!cid) throw new Error("Pilih pelanggan");
        if (lines.some((l) => !l.productId || l.quantity <= 0)) throw new Error("Lengkapi item pesanan");
        const oid = uid("o");
        const num = `ORD-${new Date().toISOString().slice(2, 10).replace(/-/g, "").slice(2)}-${String(d.customerOrder.length + 1).padStart(3, "0")}`;
        d.customerOrder.push({
          id: oid, customerId: cid, orderNumber: num, sourceChannel: source, status: "received",
          fulfillmentDate: date || null, fulfillmentTime: time || null, deliveryAddress: address || null,
          quotedTotal: total, subtotal: total, total, negotiationStatus: null,
          trackingToken: Math.random().toString(36).slice(2, 14), createdAt: nowIso(),
        });
        for (const l of computed) {
          const item: OrderItem = {
            id: uid("oi"), orderId: oid, productId: l.productId, quantity: l.quantity, uomId: "pcs", unitPrice: l.unitPrice, subtotal: l.subtotal,
            statedBudget: l.budget, customization: l.customization || null, decorationType: l.decorationType,
            complexityScore: null, sizePortion: l.sizePortion || null, tierCount: l.tierCount ? Number(l.tierCount) : null,
          };
          d.orderItem.push(item);
        }
        d.orderStatusHistory.push({ id: uid("h"), orderId: oid, oldStatus: null, newStatus: "received", changedAt: nowIso(), changedBy: userId });
        const r = screeningReason(d, computed.map((l) => ({ productId: l.productId, subtotal: l.subtotal, statedBudget: l.budget })));
        if (r) {
          d.customerOrder.find((o) => o.id === oid)!.status = "requires_review";
          d.orderStatusHistory.push({ id: uid("h"), orderId: oid, oldStatus: "received", newStatus: "requires_review", changedAt: nowIso(), changedBy: null });
          d.orderReview.push({ id: uid("rv"), orderId: oid, reason: r, status: "pending", reviewedBy: null, reviewedAt: null, notes: null });
        }
        return oid;
      });
      toast.success(reason ? "Pesanan disimpan & ditandai Perlu Review" : "Pesanan disimpan");
      nav({ to: "/orders/$id", params: { id }, replace: true });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <AppShell back title="Pesanan baru" bottomBar={<Button className="w-full py-4" onClick={save}>Simpan pesanan{total ? ` · ${rupiah(total)}` : ""}</Button>}>
      {(user) => (
        <div className="space-y-5 pb-6">
          <SectionTitle>Pelanggan</SectionTitle>
          <div className="-mt-2 flex gap-2">
            <Chip active={customerMode === "existing"} onClick={() => setCustomerMode("existing")}>Pelanggan lama</Chip>
            <Chip active={customerMode === "new"} onClick={() => setCustomerMode("new")}>Pelanggan baru</Chip>
          </div>
          {customerMode === "existing" ? (
            <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className={inputCls}>
              {db.customer.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.phone ?? c.email}</option>)}
            </select>
          ) : (
            <div className="space-y-3">
              <input className={inputCls} placeholder="Nama *" value={cust.name} onChange={(e) => setCust({ ...cust, name: e.target.value })} />
              <input className={inputCls} placeholder="No. HP / WhatsApp" value={cust.phone} onChange={(e) => setCust({ ...cust, phone: e.target.value })} />
              <input className={inputCls} placeholder="Email" value={cust.email} onChange={(e) => setCust({ ...cust, email: e.target.value })} />
              <input className={inputCls} placeholder="Alamat" value={cust.address} onChange={(e) => setCust({ ...cust, address: e.target.value })} />
            </div>
          )}

          <Field label="Kanal sumber">
            <div className="flex flex-wrap gap-2">{SOURCE_CHANNELS.map((s) => <Chip key={s} active={source === s} onClick={() => setSource(s)}>{s}</Chip>)}</div>
          </Field>

          <SectionTitle action={<button onClick={() => setLines([...lines, newLine()])} className="flex items-center gap-1 text-sm font-medium text-accent"><Plus className="h-4 w-4" />Item</button>}>Item</SectionTitle>
          {computed.map((l, idx) => {
            const p = db.product.find((x) => x.id === l.productId);
            return (
              <Card key={l.key} className="-mt-2 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Item {idx + 1}</p>
                  {lines.length > 1 && <button onClick={() => setLines(lines.filter((x) => x.key !== l.key))}><Trash2 className="h-4 w-4 text-muted-foreground" /></button>}
                </div>
                <select value={l.productId} className={inputCls} onChange={(e) => upd(l.key, { productId: e.target.value, unitPrice: db.product.find((x) => x.id === e.target.value)?.basePrice ?? 0 })}>
                  {products.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                </select>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Jumlah"><input type="number" min={1} value={l.quantity} onChange={(e) => upd(l.key, { quantity: Number(e.target.value) })} className={inputCls} /></Field>
                  {user.role === "admin" && <Field label="Harga satuan"><input type="number" value={l.unitPrice} onChange={(e) => upd(l.key, { unitPrice: Number(e.target.value) })} className={inputCls} /></Field>}
                </div>
                {p?.productionType === "unit" && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Ukuran">
                        <select value={l.sizePortion} onChange={(e) => upd(l.key, { sizePortion: e.target.value as SizePortion | "" })} className={inputCls}>
                          <option value="">-</option>{(Object.keys(sizeLabel) as SizePortion[]).map((s) => <option key={s} value={s}>{sizeLabel[s]}</option>)}
                        </select>
                      </Field>
                      <Field label="Jumlah tier"><input type="number" min={1} value={l.tierCount} onChange={(e) => upd(l.key, { tierCount: e.target.value })} className={inputCls} /></Field>
                    </div>
                    <Field label="Dekorasi">
                      <div className="flex flex-wrap gap-2">{(Object.keys(decorationLabel) as DecorationType[]).map((d) => <Chip key={d} active={l.decorationType === d} onClick={() => upd(l.key, { decorationType: d })}>{decorationLabel[d]}</Chip>)}</div>
                    </Field>
                    <Field label="Kustomisasi"><textarea rows={2} value={l.customization} onChange={(e) => upd(l.key, { customization: e.target.value })} className={inputCls} placeholder="Tulisan, tema, warna…" /></Field>
                  </>
                )}
                <Field label="Budget pelanggan (opsional)" hint={user.role === "admin" ? `Subtotal ${rupiah(l.subtotal)}` : undefined}>
                  <input type="number" value={l.statedBudget} onChange={(e) => upd(l.key, { statedBudget: e.target.value })} className={inputCls} placeholder="0" />
                </Field>
              </Card>
            );
          })}

          {reason && (
            <div className="flex gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0" />Akan ditandai "Perlu Review": {reason}
            </div>
          )}

          <SectionTitle>Pengambilan</SectionTitle>
          <div className="-mt-2 grid grid-cols-2 gap-3">
            <Field label="Tanggal"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} /></Field>
            <Field label="Jam"><input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={inputCls} /></Field>
          </div>
          <Field label="Alamat kirim (kosongkan jika diambil)"><textarea rows={2} value={address} onChange={(e) => setAddress(e.target.value)} className={inputCls} /></Field>
        </div>
      )}
    </AppShell>
  );
}
