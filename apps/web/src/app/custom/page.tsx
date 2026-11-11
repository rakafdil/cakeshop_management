
"use client";

import { useState } from "react";

import { PRODUCTS, rupiah, type Product } from "@/config/store";
import { ShopLayout, CustomizeSheet } from "@/components/shop";
import Image from "next/image";

export default function Custom() {
  const [sheet, setSheet] = useState<Product | null>(null);

  const list = PRODUCTS.filter((p) => p.customizable);

  return (
    <ShopLayout>
      <div className="px-4 pt-5">
        <div className="rounded-3xl bg-butter p-5">
          <h1 className="font-display text-2xl">
            Pesan Custom
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Pilih dasar kuenya, lalu atur rasa, ukuran, dekorasi,
            tulisan & tanggal. Minimal H-2.
          </p>
        </div>

        <div className="mt-4 space-y-3">
          {list.map((p) => (
            <button
              key={p.id}
              onClick={() => setSheet(p)}
              className="flex w-full items-center gap-4 rounded-3xl bg-card p-3 text-left shadow-soft"
            >
              <Image
                src={p.image}
                alt={p.name}
                className="h-20 w-20 rounded-2xl object-cover"
              />

              <div className="flex-1">
                <p className="font-semibold">{p.name}</p>
                <p className="text-sm text-primary">
                  mulai {rupiah(p.price)}
                </p>
              </div>

              <span className="rounded-full bg-accent px-3 py-1.5 text-xs font-bold text-accent-foreground">
                Kustomisasi
              </span>
            </button>
          ))}
        </div>
      </div>

      <CustomizeSheet
        product={sheet}
        onClose={() => setSheet(null)}
      />
    </ShopLayout>
  );
}
