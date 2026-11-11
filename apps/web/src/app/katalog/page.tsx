"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { CATEGORIES, PRODUCTS, type Product } from "@/config/store";
import { ShopLayout, ProductCard, CustomizeSheet } from "@/components/shop";

export default function Katalog() {
  const searchParams = useSearchParams();
  const kategori = searchParams.get("kategori") ?? undefined;

  const [sheet, setSheet] = useState<Product | null>(null);
  const [q, setQ] = useState("");

  const term = q.trim().toLowerCase();

  const list = PRODUCTS.filter(
    (p) =>
      (!kategori || p.category === kategori) &&
      (!term || `${p.name} ${p.description}`.toLowerCase().includes(term)),
  );

  const chip = (active: boolean) =>
    `shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${
      active ? "bg-primary text-primary-foreground" : "bg-card"
    }`;

  return (
    <ShopLayout>
      <div className="px-4 pb-2 pt-4">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari kue, pastry, cookies…"
          aria-label="Cari produk"
          className="w-full rounded-full border bg-card px-5 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="sticky top-14 z-20 flex gap-2 overflow-x-auto bg-shop px-4 py-3">
        <Link href="/katalog" className={chip(!kategori)}>
          Semua
        </Link>

        {CATEGORIES.map((c) => (
          <Link
            key={c.id}
            href={`/katalog?kategori=${encodeURIComponent(c.id)}`}
            className={chip(kategori === c.id)}
          >
            {c.name}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 px-4 pt-1 sm:grid-cols-3">
        {list.map((p) => (
          <ProductCard key={p.id} p={p} onCustomize={setSheet} />
        ))}
      </div>

      {list.length === 0 && (
        <p className="px-4 py-16 text-center text-sm text-muted-foreground">
          Produk "{q}" tidak ditemukan. Coba kata lain.
        </p>
      )}

      <CustomizeSheet product={sheet} onClose={() => setSheet(null)} />
    </ShopLayout>
  );
}
