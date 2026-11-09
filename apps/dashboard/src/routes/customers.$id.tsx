import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail, MapPin, Phone } from "lucide-react";
import { AppShell, Badge, Card, SectionTitle, meta } from "@/components/app-shell";
import { dateFmt, orderStatusLabel, orderStatusTone, rupiah } from "@/lib/db/labels";
import { useDb } from "@/lib/db/store";

export const Route = createFileRoute("/customers/$id")({
  head: () => meta("Pelanggan — Cakeshop Manager", "Profil pelanggan dan riwayat pesanannya."),
  component: CustomerDetail,
});

function CustomerDetail() {
  const { id } = Route.useParams();
  const db = useDb();
  const c = db.customer.find((x) => x.id === id);
  if (!c) return <AppShell back title="Tidak ditemukan">{() => null}</AppShell>;
  const orders = db.customerOrder.filter((o) => o.customerId === id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const spent = orders.filter((o) => o.status === "completed").reduce((s, o) => s + o.total, 0);

  return (
    <AppShell back>
      {(user) => (
        <div className="pb-6">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent font-display text-2xl font-semibold text-accent-foreground">{c.name.charAt(0)}</div>
            <div>
              <h1 className="font-display text-2xl font-semibold">{c.name}</h1>
              <p className="text-sm text-muted-foreground">Pelanggan sejak {dateFmt(c.createdAt, { month: "long", year: "numeric" })}</p>
            </div>
          </div>
          <Card className="mt-4 space-y-2 text-sm">
            {c.phone && <a href={`tel:${c.phone}`} className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" />{c.phone}</a>}
            {c.email && <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" />{c.email}</p>}
            {c.address && <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" />{c.address}</p>}
          </Card>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Card><p className="text-xs text-muted-foreground">Total pesanan</p><p className="font-display text-2xl font-semibold">{orders.length}</p></Card>
            {user.role === "admin" && <Card><p className="text-xs text-muted-foreground">Belanja (selesai)</p><p className="font-display text-xl font-semibold">{rupiah(spent)}</p></Card>}
          </div>
          <SectionTitle>Riwayat pesanan</SectionTitle>
          <div className="space-y-2">
            {orders.map((o) => (
              <Link key={o.id} to="/orders/$id" params={{ id: o.id }} className="block">
                <Card className="flex items-center justify-between py-3">
                  <div><p className="text-sm font-semibold">{o.orderNumber}</p><p className="text-xs text-muted-foreground">{dateFmt(o.createdAt)} · {o.sourceChannel}</p></div>
                  <Badge tone={orderStatusTone[o.status]}>{orderStatusLabel[o.status]}</Badge>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </AppShell>
  );
}
