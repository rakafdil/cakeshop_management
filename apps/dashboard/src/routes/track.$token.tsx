import { createFileRoute } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { meta } from "@/components/app-shell";
import { orderStatusLabel } from "@/lib/db/labels";
import { useDb, useHydrated } from "@/lib/db/store";
import type { OrderStatus } from "@/lib/db/types";

const steps: OrderStatus[] = ["received", "confirmed", "in_production", "ready", "completed"];

export const Route = createFileRoute("/track/$token")({
  head: () => meta("Lacak Pesanan — Cakeshop", "Cek status pesanan kue kamu tanpa perlu login."),
  component: Track,
});

function Track() {
  const { token } = Route.useParams();
  const db = useDb();
  const hydrated = useHydrated();
  const o = db.customerOrder.find((x) => x.trackingToken === token);
  if (!hydrated) return null;
  if (!o) return <div className="flex min-h-screen items-center justify-center p-6 text-center text-muted-foreground">Link pelacakan tidak valid.</div>;

  const name = db.customer.find((c) => c.id === o.customerId)?.name.split(" ")[0];
  const item = db.orderItem.filter((i) => i.orderId === o.id).map((i) => `${i.quantity}× ${db.product.find((p) => p.id === i.productId)?.name}`).join(", ");
  const status = o.status === "requires_review" ? "received" : o.status === "out_for_delivery" ? "ready" : o.status;
  const idx = steps.indexOf(status);
  const cancelled = idx < 0;

  return (
    <div className="mx-auto min-h-screen max-w-md bg-background">
      <div className="rounded-b-[2rem] bg-hero px-6 pb-10 pt-12 text-primary-foreground">
        <p className="text-sm opacity-80">Pesanan {o.orderNumber}</p>
        <h1 className="mt-1 font-display text-3xl font-semibold">Hai {name}, pesananmu {cancelled ? "dibatalkan" : <i>{orderStatusLabel[o.status].toLowerCase()}</i>} 🎂</h1>
        <p className="mt-3 text-sm opacity-90">{item}</p>
        {o.fulfillmentDate && <p className="mt-1 text-sm opacity-90">Estimasi selesai: {new Date(o.fulfillmentDate + "T00:00:00").toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" })}{o.fulfillmentTime ? `, ${o.fulfillmentTime}` : ""}</p>}
      </div>
      {!cancelled && (
        <ol className="space-y-5 px-8 py-8">
          {steps.map((s, i) => (
            <li key={s} className="flex items-center gap-4">
              <span className={`flex h-8 w-8 items-center justify-center rounded-full ${i <= idx ? "bg-accent text-accent-foreground" : "border-2 bg-card text-muted-foreground"}`}>
                {i < idx || (i === idx && s === "completed") ? <Check className="h-4 w-4" /> : <span className="text-xs">{i + 1}</span>}
              </span>
              <span className={i <= idx ? "font-semibold" : "text-muted-foreground"}>{orderStatusLabel[s]}</span>
            </li>
          ))}
        </ol>
      )}
      <p className="px-8 pb-10 text-center text-xs text-muted-foreground">Ada pertanyaan? Balas chat WhatsApp kami kapan saja.</p>
    </div>
  );
}
