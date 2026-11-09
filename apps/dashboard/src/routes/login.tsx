import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChefHat, Crown } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button, Field, inputCls, meta } from "@/components/app-shell";
import { login } from "@/lib/db/store";

export const Route = createFileRoute("/login")({
  head: () => meta("Masuk — Cakeshop Manager", "Masuk sebagai pemilik atau pegawai toko kue."),
  component: Login,
});

const demo = [
  { label: "Admin", email: "admin@cakeshop.local", password: "admin1234", icon: Crown, desc: "Akses penuh: harga, HPP, keuangan" },
  { label: "Pegawai", email: "staff@cakeshop.local", password: "staff1234", icon: ChefHat, desc: "Resep, produksi, stok, pesanan" },
];

function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const submit = async (e: string, p: string) => {
    try {
      const u = await login(e, p);
      toast.success(`Halo, ${u.name}`);
      nav({ to: "/", replace: true });
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-background">
      <div className="rounded-b-[2.5rem] bg-hero px-6 pb-12 pt-16 text-primary-foreground">
        <p className="text-sm opacity-80">Cakeshop Manager</p>
        <h1 className="mt-2 font-display text-4xl font-semibold leading-tight">Dapur rapi,<br />usaha naik kelas.</h1>
      </div>
      <div className="flex-1 px-6 py-8">
        <p className="mb-3 text-sm font-medium">Masuk cepat (akun demo)</p>
        <div className="grid grid-cols-2 gap-3">
          {demo.map((d) => (
            <button key={d.label} onClick={() => submit(d.email, d.password)} className="rounded-2xl border bg-card p-4 text-left transition active:scale-[0.98]">
              <d.icon className="h-6 w-6 text-accent" />
              <p className="mt-2 font-semibold">{d.label}</p>
              <p className="text-xs text-muted-foreground">{d.desc}</p>
            </button>
          ))}
        </div>

        <div className="my-7 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />atau<span className="h-px flex-1 bg-border" /></div>

        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); submit(email, password); }}>
          <Field label="Email"><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="owner@cakeshop.id" /></Field>
          <Field label="Kata sandi"><input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} placeholder="••••••" /></Field>
          <Button className="w-full py-3.5">Masuk</Button>
        </form>
        <p className="mt-4 text-center text-xs text-muted-foreground">Demo: admin@cakeshop.local / admin1234</p>
      </div>
    </div>
  );
}
