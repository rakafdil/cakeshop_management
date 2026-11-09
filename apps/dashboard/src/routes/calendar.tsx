import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, Check, ChevronLeft, ChevronRight, Clock, Megaphone, PackagePlus, Pencil, Plus, ReceiptText, Search, ChefHat, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell, Badge, Button, Empty, Field, Sheet, inputCls, meta } from "@/components/app-shell";
import { businessEvents, eventLabels, localDate, monthDays, type BusinessEvent, type EventKind } from "@/lib/db/calendar";
import { dateFmt } from "@/lib/db/labels";
import { nowIso, uid } from "@/lib/db/logic";
import { mutate, useDb } from "@/lib/db/store";

export const Route = createFileRoute("/calendar")({
  head: () => meta("Kalender bisnis — Cakeshop Manager", "Agenda pesanan, produksi, rencana konten, restok, dan riwayat aktivitas toko kue."),
  component: BusinessCalendar,
});
const tones: Record<EventKind, string> = { order: "bg-accent/15 text-accent", production: "bg-warning/20 text-foreground", content: "bg-chart-5/15 text-chart-5", restock: "bg-success/15 text-success", other: "bg-muted text-muted-foreground" };
const dots: Record<EventKind, string> = { order: "bg-accent", production: "bg-warning", content: "bg-chart-5", restock: "bg-success", other: "bg-muted-foreground" };
const icons = { order: ReceiptText, production: ChefHat, content: Megaphone, restock: PackagePlus, other: CalendarDays };
type PlanForm = { id: string; kind: "restock" | "content" | "other"; title: string; date: string; time: string; notes: string; platform: string };

function BusinessCalendar() {
  const db = useDb();
  const today = localDate(new Date());
  const [month, setMonth] = useState(today.slice(0, 7));
  const [selected, setSelected] = useState(today);
  const [view, setView] = useState<"month" | "agenda">("month");
  const [kind, setKind] = useState<EventKind | "all">("all");
  const [period, setPeriod] = useState("all");
  const [query, setQuery] = useState("");
  const [detail, setDetail] = useState<BusinessEvent | null>(null);
  const [form, setForm] = useState<PlanForm | null>(null);
  const change = (key: keyof PlanForm, value: string) => setForm(f => f ? { ...f, [key]: value } : f);
  const openNew = () => setForm({ id: "", kind: "restock", title: "", date: selected, time: "", notes: "", platform: "Instagram" });
  const shift = (step: number) => {
    const date = new Date(`${month}-01T00:00:00`);
    date.setMonth(date.getMonth() + step);
    const next = localDate(date);
    setMonth(next.slice(0, 7)); setSelected(next);
  };
  return <AppShell title="Kalender bisnis" subtitle="Agenda toko" fab={false} action={<Button variant="accent" className="h-10 w-10 shrink-0 p-0" aria-label="Tambah aktivitas" title="Tambah aktivitas" onClick={openNew}><Plus className="h-5 w-5" /></Button>}>
    {user => {
      const events = businessEvents(db, user.role);
      const filtered = events.filter(e => (kind === "all" || kind === e.kind) && `${e.title} ${e.notes}`.toLowerCase().includes(query.trim().toLowerCase()) && (period === "all" || (period === "past" ? e.date < today : period === "future" ? e.date >= today : e.state === "planned" && e.date < today)));
      const monthly = filtered.filter(e => e.date.startsWith(month));
      const listed = monthly.filter(e => view === "agenda" || e.date === selected);
      const groups = [...new Set(listed.map(e => e.date))];
      const live = detail ? events.find(e => e.id === detail.id) ?? null : null;
      const editable = live?.source === "activity" || (live?.source === "content" && user.role === "admin");
      const edit = () => {
        if (!live) return;
        if (live.source === "activity") {
          const plan = db.calendarActivity?.find(p => p.id === live.sourceId);
          if (plan) setForm({ ...plan, platform: "Instagram" });
        } else if (live.source === "content") {
          const content = db.content.find(c => c.id === live.sourceId);
          if (content) setForm({ id: content.id, kind: "content", title: content.title, date: content.scheduledDate?.slice(0, 10) ?? selected, time: "", notes: content.content, platform: content.platform });
        }
        setDetail(null);
      };
      const updateStatus = (state: "completed" | "cancelled" | "planned") => {
        if (!live || !editable) return;
        mutate(d => {
          if (live.source === "activity") { const plan = d.calendarActivity?.find(p => p.id === live.sourceId); if (plan) plan.status = state; }
          else { const content = d.content.find(c => c.id === live.sourceId); if (content) content.status = state === "completed" ? "posted" : state === "cancelled" ? "skipped" : "planned"; }
        });
        toast.success("Status aktivitas diperbarui");
      };
      const save = () => {
        if (!form || !form.title.trim() || !form.date || (form.kind === "content" && (!form.notes.trim() || user.role !== "admin"))) { toast.error("Lengkapi judul, tanggal, dan isi konten"); return; }
        mutate(d => {
          if (form.kind === "content") {
            const existing = d.content.find(c => c.id === form.id);
            const values = { title: form.title.trim(), content: form.notes.trim(), scheduledDate: form.date, platform: form.platform };
            if (existing) Object.assign(existing, values);
            else d.content.push({ ...values, id: uid("ct"), status: "planned", createdAt: nowIso() });
          } else {
            d.calendarActivity ??= [];
            const existing = d.calendarActivity.find(p => p.id === form.id);
            const values = { title: form.title.trim(), kind: form.kind, date: form.date, time: form.time, notes: form.notes.trim() };
            if (existing) Object.assign(existing, values);
            else d.calendarActivity.push({ ...values, id: uid("ca"), status: "planned", createdBy: user.id });
          }
        });
        setMonth(form.date.slice(0, 7)); setSelected(form.date); setQuery(""); setKind("all"); setPeriod("all"); setForm(null);
        toast.success("Aktivitas disimpan");
      };
      return <div className="pb-5">
        <div className="mb-4 grid grid-cols-3 divide-x border-y py-3 text-center">{[{ label: "Hari ini", value: events.filter(e => e.date === today && e.state !== "cancelled").length }, { label: "Akan datang", value: events.filter(e => e.date > today && e.state === "planned").length }, { label: "Terlewat", value: events.filter(e => e.date < today && e.state === "planned").length }].map(s => <div key={s.label}><p className="font-display text-xl font-semibold">{s.value}</p><p className="text-[11px] text-muted-foreground">{s.label}</p></div>)}</div>
        <div className="mb-3 flex rounded-lg bg-muted p-1" role="group" aria-label="Tampilan kalender">{(["month", "agenda"] as const).map(v => <Button key={v} variant="outline" aria-pressed={view === v} onClick={() => setView(v)} className={`flex-1 rounded-md border-0 py-2 ${view !== v ? "bg-transparent text-muted-foreground" : ""}`}>{v === "month" ? "Bulanan" : "Agenda"}</Button>)}</div>
        <label className="flex items-center gap-2 rounded-lg border px-3 py-2.5"><Search className="h-4 w-4 shrink-0 text-muted-foreground" /><input aria-label="Cari aktivitas" placeholder="Cari aktivitas..." value={query} onChange={e => setQuery(e.target.value)} className="min-w-0 flex-1 bg-transparent text-sm outline-none" /></label>
        <div className="mt-2 grid grid-cols-2 gap-2"><select aria-label="Jenis aktivitas" className={`${inputCls} rounded-lg py-2.5`} value={kind} onChange={e => setKind(e.target.value as EventKind | "all")}><option value="all">Semua aktivitas</option>{Object.entries(eventLabels).filter(([k]) => k !== "content" || user.role === "admin").map(([k, label]) => <option key={k} value={k}>{label}</option>)}</select><select aria-label="Periode aktivitas" className={`${inputCls} rounded-lg py-2.5`} value={period} onChange={e => setPeriod(e.target.value)}><option value="all">Semua waktu</option><option value="past">Sudah berlalu</option><option value="future">Hari ini & mendatang</option><option value="overdue">Terlewat</option></select></div>
        <div className="mb-3 mt-5 flex items-center justify-between gap-1"><Button variant="outline" className="h-9 w-9 rounded-lg p-0" aria-label="Bulan sebelumnya" title="Bulan sebelumnya" onClick={() => shift(-1)}><ChevronLeft className="h-4 w-4" /></Button><h2 className="text-sm font-semibold capitalize">{dateFmt(`${month}-01`, { month: "long", year: "numeric" })}</h2><Button variant="outline" className="rounded-lg px-2 py-2 text-xs" onClick={() => { setMonth(today.slice(0, 7)); setSelected(today); }}>Hari ini</Button><Button variant="outline" className="h-9 w-9 rounded-lg p-0" aria-label="Bulan berikutnya" title="Bulan berikutnya" onClick={() => shift(1)}><ChevronRight className="h-4 w-4" /></Button></div>
        {view === "month" && <div className="border-b pb-4"><div className="grid grid-cols-7 text-center text-[11px] text-muted-foreground">{["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map(day => <div key={day} className="py-2">{day}</div>)}</div><div className="grid grid-cols-7 gap-1">{monthDays(month).map((date, i) => {
          const kinds = [...new Set(monthly.filter(e => e.date === date).map(e => e.kind))];
          return date ? <Button key={date} variant="outline" aria-label={date} aria-pressed={selected === date} onClick={() => setSelected(date)} className={`h-12 min-w-0 flex-col gap-1 rounded-lg border-0 p-0 font-normal ${selected === date ? "bg-primary text-primary-foreground" : date === today ? "bg-accent/10 text-accent ring-1 ring-accent" : "bg-transparent"}`}><span>{Number(date.slice(-2))}</span><span className="flex h-1.5 items-center gap-0.5">{kinds.map(k => <span key={k} className={`h-1 w-1 rounded-full ${selected === date ? "bg-primary-foreground" : dots[k]}`} />)}</span></Button> : <div key={`empty-${i}`} className="h-12" />;
        })}</div><div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground">{Object.entries(eventLabels).filter(([k]) => k !== "content" || user.role === "admin").map(([k, label]) => <span key={k} className="flex items-center gap-1"><span className={`h-1.5 w-1.5 rounded-full ${dots[k as EventKind]}`} />{label}</span>)}</div></div>}
        <div className="mt-4 flex items-center justify-between"><h2 className="font-display text-lg font-semibold">{view === "month" ? dateFmt(selected, { weekday: "long", day: "numeric", month: "short" }) : "Agenda bulan ini"}</h2><span className="text-xs text-muted-foreground">{listed.length} aktivitas</span></div>
        {listed.length === 0 && <div className="mt-3"><Empty>Tidak ada aktivitas{query || kind !== "all" || period !== "all" ? " yang sesuai saringan" : " pada tanggal ini"}.</Empty><Button variant="outline" className="mt-3 w-full rounded-lg" onClick={openNew}><Plus className="h-4 w-4" />Tambah aktivitas</Button></div>}
        {groups.map(date => <section key={date} className="mt-3">{view === "agenda" && <h3 className="mb-2 text-xs font-semibold text-muted-foreground">{dateFmt(date, { weekday: "long", day: "numeric", month: "short" })}</h3>}<div className="space-y-2">{listed.filter(e => e.date === date).map(e => {
          const Icon = icons[e.kind];
          return <Button variant="outline" key={e.id} onClick={() => setDetail(e)} className="w-full justify-start gap-3 rounded-lg p-3 text-left font-normal"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tones[e.kind]}`}><Icon className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block break-words text-sm font-semibold">{e.title}</span><span className="mt-1 block text-[11px] text-muted-foreground">{e.time || "Sepanjang hari"} · {eventLabels[e.kind]} · {e.status}</span>{e.state === "planned" && e.date < today && <span className="text-[11px] text-destructive">Jadwal terlewat</span>}</span><ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" /></Button>;
        })}</div></section>)}
        <Sheet open={Boolean(live)} onClose={() => setDetail(null)} title="Detail aktivitas">{live && <div className="space-y-4"><Badge tone={tones[live.kind]}>{eventLabels[live.kind]} · {live.status}</Badge><h4 className="break-words font-display text-xl font-semibold">{live.title}</h4><p className="flex items-center gap-2 text-sm"><Clock className="h-4 w-4" />{dateFmt(live.date, { day: "numeric", month: "long", year: "numeric" })} · {live.time || "Sepanjang hari"}</p>{live.notes && <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">{live.notes}</p>}
          {(live.source === "order" || live.source === "history") && <Link to="/orders/$id" params={{ id: live.sourceId }} className="add-btn">Buka pesanan<ChevronRight className="h-4 w-4" /></Link>}
          {live.source === "production" && <Link to="/kitchen" search={{ tab: "produksi" }} className="add-btn">Buka produksi<ChevronRight className="h-4 w-4" /></Link>}
          {live.source === "stock" && <Link to="/inventory/$id" params={{ id: live.sourceId }} className="add-btn">Buka inventori<ChevronRight className="h-4 w-4" /></Link>}
          {editable && <><div className="flex gap-2"><Button variant="outline" className="flex-1" onClick={edit}><Pencil className="h-4 w-4" />Ubah</Button>{live.state === "planned" ? <Button className="flex-1" onClick={() => updateStatus("completed")}><Check className="h-4 w-4" />{live.kind === "content" ? "Terposting" : "Selesai"}</Button> : <Button className="flex-1" onClick={() => updateStatus("planned")}>Jadwalkan lagi</Button>}</div><div className="flex gap-2">{live.state === "planned" && <Button variant="outline" className="flex-1" onClick={() => updateStatus("cancelled")}><X className="h-4 w-4" />Batalkan</Button>}<Button variant="danger" className="flex-1" onClick={() => { if (!confirm("Hapus aktivitas ini?")) return; mutate(d => { if (live.source === "activity") d.calendarActivity = (d.calendarActivity ?? []).filter(p => p.id !== live.sourceId); else d.content = d.content.filter(c => c.id !== live.sourceId); }); setDetail(null); toast.success("Aktivitas dihapus"); }}><Trash2 className="h-4 w-4" />Hapus</Button></div>{live.kind === "restock" && <Link to="/kitchen" search={{ tab: "inventori" }} className="add-btn">Catat stok masuk<PackagePlus className="h-4 w-4" /></Link>}</>}
        </div>}</Sheet>
        <Sheet open={Boolean(form)} onClose={() => setForm(null)} title={form?.id ? "Ubah aktivitas" : "Aktivitas baru"}>{form && <form className="space-y-3" onSubmit={e => { e.preventDefault(); save(); }}>
          <Field label="Jenis"><select className={inputCls} value={form.kind} disabled={Boolean(form.id)} onChange={e => change("kind", e.target.value)}><option value="restock">Rencana restok</option>{user.role === "admin" && <option value="content">Rencana konten</option>}<option value="other">Aktivitas lainnya</option></select></Field>
          <Field label="Judul"><input required className={inputCls} value={form.title} onChange={e => change("title", e.target.value)} placeholder={form.kind === "restock" ? "Beli butter dan tepung" : "Judul aktivitas"} /></Field>
          <Field label="Tanggal"><input required type="date" className={inputCls} value={form.date} onChange={e => change("date", e.target.value)} /></Field>
          {form.kind !== "content" && <Field label="Jam (opsional)"><input type="time" className={inputCls} value={form.time} onChange={e => change("time", e.target.value)} /></Field>}
          {form.kind === "content" && <Field label="Platform"><select className={inputCls} value={form.platform} onChange={e => change("platform", e.target.value)}>{["Instagram", "TikTok", "WhatsApp", "Facebook"].map(p => <option key={p}>{p}</option>)}</select></Field>}
          <Field label={form.kind === "content" ? "Isi / brief konten" : "Catatan (opsional)"}><textarea required={form.kind === "content"} rows={3} className={inputCls} value={form.notes} onChange={e => change("notes", e.target.value)} /></Field><Button className="w-full" type="submit"><Check className="h-4 w-4" />Simpan aktivitas</Button>
        </form>}</Sheet>
      </div>;
    }}
  </AppShell>;
}