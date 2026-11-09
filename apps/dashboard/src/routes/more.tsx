import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CalendarDays, ChevronRight, LogOut, Megaphone, Plus, RotateCcw, Users, Wrench } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell, Badge, Button, Card, Chip, Field, SectionTitle, Sheet, inputCls, meta } from "@/components/app-shell";
import { contentStatusLabel, dateFmt, rupiah } from "@/lib/db/labels";
import { currentLaborRate, nowIso, today, uid } from "@/lib/db/logic";
import { logout, mutate, resetDb, useDb } from "@/lib/db/store";
import type { ContentStatus, UserRole } from "@/lib/db/types";

export const Route = createFileRoute("/more")({
  head: () => meta("Lainnya — Cakeshop Manager", "Pelanggan, konten marketing, alat, tarif, dan pengguna."),
  component: More,
});

type SheetKind = null | "customer" | "content" | "tool" | "labor" | "user";

function More() {
  const db = useDb();
  const nav = useNavigate();
  const [sheet, setSheet] = useState<SheetKind>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const open = (k: SheetKind, init: Record<string, string> = {}) => { setForm(init); setSheet(k); };
  const close = () => setSheet(null);
  const req = (...keys: string[]) => keys.every((k) => (form[k] ?? "").trim());

  return (
    <AppShell title="Lainnya">
      {(user) => {
        const isAdmin = user.role === "admin";
        return (
          <div className="pb-4">
            <Card className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent font-display text-lg font-semibold text-accent-foreground">{user.name.charAt(0)}</div>
              <div className="flex-1"><p className="font-semibold">{user.name}</p><p className="text-xs text-muted-foreground">{user.email} · {isAdmin ? "Pemilik" : "Pegawai"}</p></div>
              <button onClick={() => { logout(); nav({ to: "/login", replace: true }); }} className="rounded-full border p-2.5" aria-label="Keluar"><LogOut className="h-4 w-4" /></button>
            </Card>

            <Link to="/calendar" className="mt-4 flex items-center gap-3 rounded-lg border p-4"><CalendarDays className="h-5 w-5 text-accent" /><span className="flex-1 font-semibold">Kalender bisnis</span><ChevronRight className="h-4 w-4" /></Link>

            <SectionTitle action={<button onClick={() => open("customer")} className="flex items-center gap-1 text-sm font-medium text-accent"><Plus className="h-4 w-4" />Tambah</button>}>
              <span className="flex items-center gap-2"><Users className="h-4 w-4" />Pelanggan</span>
            </SectionTitle>
            <Card className="divide-y p-0">
              {db.customer.map((c) => {
                const orders = db.customerOrder.filter((o) => o.customerId === c.id);
                return (
                  <Link key={c.id} to="/customers/$id" params={{ id: c.id }} className="flex items-center gap-3 p-3.5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary font-display font-semibold">{c.name.charAt(0)}</div>
                    <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{c.name}</p><p className="text-xs text-muted-foreground">{c.phone ?? c.email ?? "-"}</p></div>
                    <span className="text-xs text-muted-foreground">{orders.length} pesanan</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                );
              })}
            </Card>

            {isAdmin && (
              <>
                <SectionTitle action={<button onClick={() => open("content", { platform: "Instagram", date: today() })} className="flex items-center gap-1 text-sm font-medium text-accent"><Plus className="h-4 w-4" />Tambah</button>}>
                  <span className="flex items-center gap-2"><Megaphone className="h-4 w-4" />Rencana konten</span>
                </SectionTitle>
                <div className="space-y-2.5">
                  {[...db.content].sort((a, b) => (a.scheduledDate ?? "").localeCompare(b.scheduledDate ?? "")).map((c) => (
                    <Card key={c.id} className="flex gap-3">
                      <div className="w-12 shrink-0 text-center"><p className="font-display text-xl font-semibold">{dateFmt(c.scheduledDate, { day: "numeric" })}</p><p className="text-[11px] text-muted-foreground">{dateFmt(c.scheduledDate, { month: "short" })}</p></div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">{c.title}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{c.platform}</p>
                        <div className="mt-2 flex gap-1.5">
                          {(["planned", "posted", "skipped"] as ContentStatus[]).map((s) => (
                            <button key={s} onClick={() => mutate((d) => { d.content.find((x) => x.id === c.id)!.status = s; })}
                              className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${c.status === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{contentStatusLabel[s]}</button>
                          ))}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                <SectionTitle action={<button onClick={() => open("tool")} className="flex items-center gap-1 text-sm font-medium text-accent"><Plus className="h-4 w-4" />Tambah</button>}>
                  <span className="flex items-center gap-2"><Wrench className="h-4 w-4" />Alat & tarif</span>
                </SectionTitle>
                <Card className="divide-y p-0">
                  {db.tool.map((t) => (
                    <div key={t.id} className="flex justify-between p-3.5 text-sm">
                      <span>{t.name}</span><span className="text-muted-foreground">{rupiah(t.purchaseCost / t.usefulLife)}/pakai</span>
                    </div>
                  ))}
                  <button onClick={() => open("labor", { rate: String(currentLaborRate(db)), date: today() })} className="flex w-full justify-between p-3.5 text-sm">
                    <span className="font-medium">Tarif tenaga kerja</span><span className="text-accent">{rupiah(currentLaborRate(db))}/jam</span>
                  </button>
                  <button onClick={() => open("labor", { risk: String(Math.round(db.riskBufferPercentage * 100)), mode: "risk" })} className="flex w-full justify-between p-3.5 text-sm">
                    <span className="font-medium">Buffer risiko gagal</span><span className="text-accent">{Math.round(db.riskBufferPercentage * 100)}%</span>
                  </button>
                </Card>

                <SectionTitle action={<button onClick={() => open("user", { role: "staff" })} className="flex items-center gap-1 text-sm font-medium text-accent"><Plus className="h-4 w-4" />Tambah</button>}>Pengguna</SectionTitle>
                <Card className="divide-y p-0">
                  {db.user.map((u) => (
                    <div key={u.id} className="flex items-center gap-3 p-3.5 text-sm">
                      <div className="flex-1"><p className="font-medium">{u.name}</p><p className="text-xs text-muted-foreground">{u.email}</p></div>
                      <Badge tone={u.role === "admin" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}>{u.role === "admin" ? "Pemilik" : "Pegawai"}</Badge>
                      {u.id !== user.id && (
                        <button onClick={() => mutate((d) => { const x = d.user.find((y) => y.id === u.id)!; x.isActive = !x.isActive; })} className={`text-xs font-medium ${u.isActive ? "text-destructive" : "text-success"}`}>{u.isActive ? "Nonaktifkan" : "Aktifkan"}</button>
                      )}
                    </div>
                  ))}
                </Card>

                <button onClick={() => { if (confirm("Kembalikan semua data ke data contoh awal?")) { resetDb(); toast.success("Data direset"); } }} className="mt-8 flex w-full items-center justify-center gap-2 text-sm text-muted-foreground">
                  <RotateCcw className="h-4 w-4" />Reset data contoh
                </button>
              </>
            )}

            <Sheet open={sheet === "customer"} onClose={close} title="Pelanggan baru">
              <div className="space-y-3">
                <input className={inputCls} placeholder="Nama *" value={form["name"] ?? ""} onChange={(e) => set("name", e.target.value)} />
                <input className={inputCls} placeholder="No. HP" value={form["phone"] ?? ""} onChange={(e) => set("phone", e.target.value)} />
                <input className={inputCls} placeholder="Email" value={form["email"] ?? ""} onChange={(e) => set("email", e.target.value)} />
                <textarea className={inputCls} placeholder="Alamat" rows={2} value={form["address"] ?? ""} onChange={(e) => set("address", e.target.value)} />
                <Button className="w-full" onClick={() => {
                  if (!req("name")) { toast.error("Nama wajib diisi"); return; }
                  mutate((d) => { d.customer.push({ id: uid("c"), name: form["name"]!.trim(), phone: form["phone"] || null, email: form["email"] || null, address: form["address"] || null, createdAt: nowIso() }); });
                  toast.success("Pelanggan ditambahkan"); close();
                }}>Simpan</Button>
              </div>
            </Sheet>

            <Sheet open={sheet === "content"} onClose={close} title="Konten baru">
              <div className="space-y-3">
                <input className={inputCls} placeholder="Judul *" value={form["title"] ?? ""} onChange={(e) => set("title", e.target.value)} />
                <textarea className={inputCls} placeholder="Isi / brief konten *" rows={3} value={form["content"] ?? ""} onChange={(e) => set("content", e.target.value)} />
                <div className="flex flex-wrap gap-2">{["Instagram", "TikTok", "WhatsApp", "Facebook"].map((p) => <Chip key={p} active={form["platform"] === p} onClick={() => set("platform", p)}>{p}</Chip>)}</div>
                <Field label="Jadwal"><input type="date" className={inputCls} value={form["date"] ?? ""} onChange={(e) => set("date", e.target.value)} /></Field>
                <Button className="w-full" onClick={() => {
                  if (!req("title", "content", "platform")) { toast.error("Lengkapi judul, isi, dan platform"); return; }
                  mutate((d) => { d.content.push({ id: uid("ct"), title: form["title"]!, content: form["content"]!, platform: form["platform"]!, status: "planned", scheduledDate: form["date"] || null, createdAt: nowIso() }); });
                  toast.success("Konten dijadwalkan"); close();
                }}>Simpan</Button>
              </div>
            </Sheet>

            <Sheet open={sheet === "tool"} onClose={close} title="Alat baru">
              <div className="space-y-3">
                <input className={inputCls} placeholder="Nama alat *" value={form["name"] ?? ""} onChange={(e) => set("name", e.target.value)} />
                <Field label="Harga beli"><input type="number" className={inputCls} value={form["cost"] ?? ""} onChange={(e) => set("cost", e.target.value)} /></Field>
                <Field label="Perkiraan umur pakai (kali)" hint="Dipakai untuk menghitung penyusutan per penggunaan."><input type="number" className={inputCls} value={form["life"] ?? ""} onChange={(e) => set("life", e.target.value)} /></Field>
                <Button className="w-full" onClick={() => {
                  if (!req("name") || !(Number(form["cost"]) >= 0) || !(Number(form["life"]) > 0)) { toast.error("Lengkapi data alat"); return; }
                  mutate((d) => { d.tool.push({ id: uid("t"), name: form["name"]!, purchaseCost: Number(form["cost"]), usefulLife: Number(form["life"]) }); });
                  toast.success("Alat ditambahkan"); close();
                }}>Simpan</Button>
              </div>
            </Sheet>

            <Sheet open={sheet === "labor"} onClose={close} title={form["mode"] === "risk" ? "Buffer risiko" : "Tarif tenaga kerja"}>
              <div className="space-y-3">
                {form["mode"] === "risk" ? (
                  <Field label="Persentase buffer (%)"><input type="number" className={inputCls} value={form["risk"] ?? ""} onChange={(e) => set("risk", e.target.value)} /></Field>
                ) : (
                  <>
                    <Field label="Tarif per jam"><input type="number" className={inputCls} value={form["rate"] ?? ""} onChange={(e) => set("rate", e.target.value)} /></Field>
                    <Field label="Berlaku mulai"><input type="date" className={inputCls} value={form["date"] ?? ""} onChange={(e) => set("date", e.target.value)} /></Field>
                  </>
                )}
                <Button className="w-full" onClick={() => {
                  if (form["mode"] === "risk") {
                    const r = Number(form["risk"]);
                    if (!(r >= 0 && r < 100)) { toast.error("0–99%"); return; }
                    mutate((d) => { d.riskBufferPercentage = r / 100; });
                  } else {
                    if (!(Number(form["rate"]) >= 0) || !form["date"]) { toast.error("Lengkapi tarif"); return; }
                    mutate((d) => { d.laborRate.push({ id: uid("lr"), ratePerHour: Number(form["rate"]), effectiveDate: form["date"]! }); });
                  }
                  toast.success("Disimpan — HPP dihitung ulang"); close();
                }}>Simpan</Button>
              </div>
            </Sheet>

            <Sheet open={sheet === "user"} onClose={close} title="Pengguna baru">
              <div className="space-y-3">
                <input className={inputCls} placeholder="Nama *" value={form["name"] ?? ""} onChange={(e) => set("name", e.target.value)} />
                <input className={inputCls} type="email" placeholder="Email *" value={form["email"] ?? ""} onChange={(e) => set("email", e.target.value)} />
                <input className={inputCls} placeholder="Kata sandi *" value={form["password"] ?? ""} onChange={(e) => set("password", e.target.value)} />
                <div className="flex gap-2">{(["staff", "admin"] as UserRole[]).map((r) => <Chip key={r} active={form["role"] === r} onClick={() => set("role", r)}>{r === "admin" ? "Pemilik" : "Pegawai"}</Chip>)}</div>
                <Button className="w-full" onClick={() => {
                  if (!req("name", "email", "password")) { toast.error("Lengkapi data"); return; }
                  try {
                    mutate((d) => {
                      if (d.user.some((u) => u.email.toLowerCase() === form["email"]!.toLowerCase())) throw new Error("Email sudah dipakai");
                      d.user.push({ id: uid("u"), name: form["name"]!, email: form["email"]!, password: form["password"]!, role: (form["role"] as UserRole) ?? "staff", isActive: true, createdAt: nowIso() });
                    });
                    toast.success("Pengguna ditambahkan"); close();
                  } catch (e) { toast.error((e as Error).message); }
                }}>Simpan</Button>
              </div>
            </Sheet>
          </div>
        );
      }}
    </AppShell>
  );
}
