"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Home, LayoutGrid, Sparkles, ShoppingBag, X } from "lucide-react";
import { STORE, CUSTOM_OPTIONS, rupiah, type Product } from "@/config/store";
import { useCart } from "@/lib/cart";
import Image from "next/image";

export function ShopHeader({ title }: { title?: string | undefined }) {
  const { count, bump } = useCart();
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/90 px-4 backdrop-blur">
      <Link href="/" className="font-display text-lg font-semibold">
        {title ?? STORE.name}
      </Link>

      <Link href="/keranjang" className="relative p-2" aria-label="Keranjang">
        <ShoppingBag
          key={bump}
          className={`h-5 w-5 ${bump ? "animate-cart-bump" : ""}`}
        />
        {count > 0 && (
          <span
            key={`b${bump}`}
            className={`${bump ? "animate-cart-bump " : ""}"absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground`}
          >
            {count}
          </span>
        )}
      </Link>
    </header>
  );
}

export function BottomNav() {
  const { count, bump } = useCart();
  const pathname = usePathname();

  const items = [
    { href: "/", label: "Beranda", icon: Home },
    { href: "/katalog", label: "Katalog", icon: LayoutGrid },
    { href: "/custom", label: "Custom", icon: Sparkles },
    { href: "/keranjang", label: "Keranjang", icon: ShoppingBag },
  ] as const;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t bg-card pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto grid max-w-xl grid-cols-4">
        {items.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className={`relative flex flex-col items-center gap-0.5 py-2 text-[11px] ${
                active ? "font-semibold text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon
                key={href === "/keranjang" ? bump : 0}
                className={`h-5 w-5 ${
                  href === "/keranjang" && bump ? "animate-cart-bump" : ""
                }`}
              />
              {label}

              {href === "/keranjang" && count > 0 && (
                <span className="absolute right-[30%] top-1 h-2 w-2 rounded-full bg-accent" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function ShopLayout({
  children,
  title,
  noNav,
}: {
  children: ReactNode;
  title?: string | undefined;
  noNav?: boolean;
}) {
  return (
    <div className="min-h-screen bg-shop pb-24">
      <ShopHeader title={title} />
      <main className="mx-auto max-w-xl">{children}</main>
      {!noNav && <BottomNav />}
    </div>
  );
}

export function ProductCard({
  p,
  onCustomize,
}: {
  p: Product;
  onCustomize: (p: Product) => void;
}) {
  const { add } = useCart();
  const [done, setDone] = useState(0);
  return (
    <div className="overflow-hidden rounded-3xl bg-card shadow-soft">
      <Link href={`/produk/${p.id}`}>
        <Image
          src={p.image}
          alt={p.name}
          loading="lazy"
          className="aspect-square w-full object-cover"
        />
      </Link>
      <div className="space-y-2 p-3">
        <Link
          href={`/produk/${p.id}`}
          className="line-clamp-2 min-h-10 text-sm font-semibold leading-tight"
        >
          {p.name}
        </Link>
        <p className="text-sm font-bold text-primary">
          {p.customizable ? "mulai " : ""}
          {rupiah(p.price)}
        </p>
        {p.customizable ? (
          <button
            onClick={() => onCustomize(p)}
            className="w-full rounded-full bg-accent py-2 text-xs font-bold text-accent-foreground"
          >
            Kustomisasi
          </button>
        ) : (
          <button
            key={done}
            onClick={() => {
              add({ productId: p.id, name: p.name, unitPrice: p.price });
              setDone((d) => d + 1);
              setTimeout(() => setDone((d) => -Math.abs(d)), 1200);
            }}
            className={`w-full rounded-full py-2 text-xs font-bold transition-colors ${done > 0 ? "animate-btn-pop bg-accent text-accent-foreground" : "bg-primary text-primary-foreground"}`}
          >
            {done > 0 ? "✓ Ditambahkan" : "+ Keranjang"}
          </button>
        )}
      </div>
    </div>
  );
}

function Chips({
  options,
  value,
  onChange,
}: {
  options: { label: string; extra?: number }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.label}
          type="button"
          onClick={() => onChange(o.label)}
          className={`rounded-full border px-3 py-1.5 text-sm ${value === o.label ? "border-primary bg-primary text-primary-foreground" : "bg-card"}`}
        >
          {o.label}
          {o.extra ? ` +${rupiah(o.extra)}` : ""}
        </button>
      ))}
    </div>
  );
}

export function CustomizeSheet({
  product,
  onClose,
}: {
  product: Product | null;
  onClose: () => void;
}) {
  const { add } = useCart();
  const [flavor, setFlavor] = useState(CUSTOM_OPTIONS.flavors[0] ?? "");
  const [size, setSize] = useState(CUSTOM_OPTIONS.sizes[0]?.label ?? "");
  const [decoration, setDecoration] = useState(
    CUSTOM_OPTIONS.decorations[0]?.label ?? "",
  );
  const [message, setMessage] = useState("");
  const [date, setDate] = useState("");
  const [err, setErr] = useState("");
  const [added, setAdded] = useState(false);
  if (!product) return null;
  const extra =
    (CUSTOM_OPTIONS.sizes.find((s) => s.label === size)?.extra ?? 0) +
    (CUSTOM_OPTIONS.decorations.find((d) => d.label === decoration)?.extra ??
      0);
  const price = product.price + extra;
  const submit = () => {
    if (!date) return setErr("Pilih tanggal dulu ya.");
    add({
      productId: product.id,
      name: product.name,
      unitPrice: price,
      custom: { flavor, size, decoration, message, date },
    });
    setErr("");
    setMessage("");
    setDate("");
    setTimeout(onClose, 350);
    setAdded(true);
    setTimeout(() => setAdded(false), 400);
  };
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div
        className="absolute inset-0 bg-foreground/40 animate-in fade-in"
        onClick={onClose}
      />
      <div className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-t-[2rem] bg-background p-5 pb-8 animate-in slide-in-from-bottom">
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-border" />
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Image
              src={product.image}
              alt=""
              className="h-14 w-14 rounded-2xl object-cover"
            />
            <div>
              <p className="font-display text-lg font-semibold">
                {product.name}
              </p>
              <p className="text-sm text-muted-foreground">
                Kustomisasi pesananmu
              </p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Tutup">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-5">
          <Field label="Rasa">
            <Chips
              options={CUSTOM_OPTIONS.flavors.map((l) => ({ label: l }))}
              value={flavor}
              onChange={setFlavor}
            />
          </Field>
          <Field label="Ukuran">
            <Chips
              options={CUSTOM_OPTIONS.sizes}
              value={size}
              onChange={setSize}
            />
          </Field>
          <Field label="Dekorasi">
            <Chips
              options={CUSTOM_OPTIONS.decorations}
              value={decoration}
              onChange={setDecoration}
            />
          </Field>
          <Field label="Tulisan di kue (opsional)">
            <input
              maxLength={40}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Happy Birthday, Mama!"
              className="w-full rounded-2xl border bg-card px-4 py-3 text-sm"
            />
          </Field>
          <Field label="Tanggal ambil / kirim">
            <input
              type="date"
              value={date}
              min={new Date(Date.now() + 2 * 864e5).toISOString().slice(0, 10)}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-2xl border bg-card px-4 py-3 text-sm"
            />
            {err && <p className="mt-1 text-xs text-destructive">{err}</p>}
          </Field>
        </div>
        <button
          onClick={submit}
          className={`${added ? "animate-btn-pop " : ""}mt-6 flex w-full items-center justify-between rounded-full bg-primary px-6 py-4 font-bold text-primary-foreground`}
        >
          <span>{added ? "✓ Ditambahkan" : "Tambah ke keranjang"}</span>
          <span>{rupiah(price)}</span>
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold">{label}</p>
      {children}
    </div>
  );
}
