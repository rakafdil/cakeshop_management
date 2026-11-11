"use client";

import { useState } from "react";
import Link from "next/link";
import { Minus, Plus } from "lucide-react";

import { rupiah } from "@/config/store";
import { ShopLayout } from "@/components/shop";
import { useCart, buildWhatsAppMessage } from "@/lib/cart";

export default function Cart() {
  const { items, setQty, total } = useCart();

  const [name, setName] = useState("");
  const [date, setDate] = useState("");

  if (!items.length) {
    return (
      <ShopLayout>
        <div className="px-6 py-24 text-center">
          <p className="font-display text-2xl">Keranjang masih kosong</p>

          <Link
            href="/katalog"
            className="mt-6 inline-block rounded-full bg-primary px-6 py-3 font-bold text-primary-foreground"
          >
            Lihat Katalog
          </Link>
        </div>
      </ShopLayout>
    );
  }

  return (
    <ShopLayout>
      <div className="space-y-3 p-4">
        <h1 className="font-display text-2xl">Keranjang</h1>

        {items.map((it) => (
          <div key={it.key} className="rounded-3xl bg-card p-4 shadow-soft">
            <div className="flex justify-between gap-3">
              <p className="font-semibold">{it.name}</p>
              <p className="font-bold text-primary">
                {rupiah(it.unitPrice * it.qty)}
              </p>
            </div>

            {it.custom && (
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {it.custom.flavor} · {it.custom.size} · {it.custom.decoration}
                {it.custom.message && ` · "${it.custom.message}"`} ·{" "}
                {it.custom.date}
              </p>
            )}

            <div className="mt-3 flex items-center gap-3">
              <button
                onClick={() => setQty(it.key, it.qty - 1)}
                className="rounded-full border p-1.5"
                aria-label="Kurangi"
              >
                <Minus className="h-3 w-3" />
              </button>

              <span className="font-bold">{it.qty}</span>

              <button
                onClick={() => setQty(it.key, it.qty + 1)}
                className="rounded-full border p-1.5"
                aria-label="Tambah"
              >
                <Plus className="h-3 w-3" />
              </button>

              <button
                onClick={() => setQty(it.key, 0)}
                className="ml-auto text-xs text-destructive"
              >
                Hapus
              </button>
            </div>
          </div>
        ))}

        <div className="space-y-3 rounded-3xl bg-card p-4">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nama pemesan"
            className="w-full rounded-2xl border px-4 py-3 text-sm"
          />

          <label className="block text-xs text-muted-foreground">
            Tanggal ambil/kirim (untuk produk non-custom)
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 w-full rounded-2xl border px-4 py-3 text-sm text-foreground"
            />
          </label>
        </div>

        <div className="flex items-center justify-between px-1 pt-2">
          <span>Total</span>
          <span className="text-xl font-bold">{rupiah(total)}</span>
        </div>

        <a
          href={buildWhatsAppMessage(items, total, name, date)}
          target="_blank"
          rel="noreferrer"
          className="block rounded-full bg-primary py-4 text-center font-bold text-primary-foreground"
        >
          Checkout via WhatsApp
        </a>
      </div>
    </ShopLayout>
  );
}
