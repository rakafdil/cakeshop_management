"use client";

import { useState } from "react";
import Link from "next/link";
import type { StaticImageData } from "next/image";
import { Minus, Plus, ArrowLeft, Leaf, Lightbulb } from "lucide-react";

import {
  CATEGORIES,
  rupiah,
  productImages,
  productInfo,
  type Product,
} from "@/config/store";

import { ShopHeader, CustomizeSheet } from "@/components/shop";
import { useCart } from "@/lib/cart";
import Image from "next/image";

export default function ProductDetail({ product: p }: { product: Product }) {
  const { add } = useCart();

  const [qty, setQty] = useState(1);
  const [open, setOpen] = useState(false);
  const [added, setAdded] = useState(false);

  const info = productInfo(p);

  const m = p.name.match(/^(.*?)\s*\((?:isi\s+)?([^)]+)\)$/i);
  const title = m ? m[1] : p.name;
  const unit = p.unit ?? (m ? m[2] : undefined);

  const cat = CATEGORIES.find((c) => c.id === p.category);

  return (
    <div className="min-h-screen bg-shop pb-28">
      <ShopHeader />

      <div className="mx-auto max-w-xl">
        <div className="relative">
          <Gallery images={productImages(p)} alt={p.name} />

          <Link
            href="/katalog"
            className="absolute left-4 top-4 rounded-full bg-card p-2"
            aria-label="Kembali"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </div>

        <div className="space-y-3 p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">
            {cat?.name}
          </p>

          <div>
            <h1 className="font-display text-3xl leading-tight">{title}</h1>

            <p className="mt-1 text-sm text-muted-foreground">
              {p.description}
            </p>
          </div>

          <p className="flex items-baseline gap-2 pt-1">
            {p.customizable && (
              <span className="text-sm text-muted-foreground">mulai</span>
            )}

            <span className="font-display text-3xl font-bold text-primary">
              {rupiah(p.price)}
            </span>

            {unit && (
              <span className="text-sm text-muted-foreground">/ {unit}</span>
            )}
          </p>

          {p.customizable && (
            <p className="rounded-2xl bg-card p-4 text-sm">
              Bisa pilih rasa, ukuran, dekorasi, tulisan, dan tanggal. Pesan
              minimal H-2.
            </p>
          )}

          {info.ingredients.length > 0 && (
            <section className="mt-4 rounded-3xl bg-card p-5">
              <h2 className="flex items-center gap-2 font-display text-xl">
                <Leaf className="h-5 w-5 text-accent" />
                Bahan pilihan
              </h2>

              <ul className="mt-3 flex flex-wrap gap-2">
                {info.ingredients.map((x) => (
                  <li
                    key={x}
                    className="rounded-full bg-secondary px-3 py-1.5 text-sm"
                  >
                    {x}
                  </li>
                ))}
              </ul>

              <p className="mt-3 text-xs text-muted-foreground">
                Tanpa pengawet, pewarna sintetis, atau margarin.
              </p>
            </section>
          )}

          {info.funFact && (
            <aside className="rounded-3xl border border-accent/30 bg-accent/10 p-5">
              <p className="flex items-center gap-2 text-sm font-bold text-accent">
                <Lightbulb className="h-4 w-4" />
                Tahukah kamu?
              </p>

              <p className="mt-2 text-sm leading-relaxed">{info.funFact}</p>
            </aside>
          )}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-card p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-xl items-center gap-3">
          {p.customizable ? (
            <button
              onClick={() => setOpen(true)}
              className="flex-1 rounded-full bg-accent py-4 font-bold text-accent-foreground"
            >
              Kustomisasi
            </button>
          ) : (
            <>
              <div className="flex items-center gap-3 rounded-full border px-3 py-2">
                <button
                  onClick={() => setQty(Math.max(1, qty - 1))}
                  aria-label="Kurangi"
                >
                  <Minus className="h-4 w-4" />
                </button>

                <span className="w-5 text-center font-bold">{qty}</span>

                <button onClick={() => setQty(qty + 1)} aria-label="Tambah">
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              <button
                onClick={() => {
                  add(
                    {
                      productId: p.id,
                      name: p.name,
                      unitPrice: p.price,
                    },
                    qty,
                  );

                  setAdded(true);
                  setTimeout(() => setAdded(false), 1500);
                }}
                key={String(added)}
                className={`flex-1 rounded-full py-4 font-bold transition-colors ${
                  added
                    ? "animate-btn-pop bg-accent text-accent-foreground"
                    : "bg-primary text-primary-foreground"
                }`}
              >
                {added
                  ? "✓ Ditambahkan"
                  : `Tambah ke keranjang · ${rupiah(p.price * qty)}`}
              </button>
            </>
          )}
        </div>
      </div>

      <CustomizeSheet
        product={open ? p : null}
        onClose={() => setOpen(false)}
      />
    </div>
  );
}

function Gallery({
  images,
  alt,
}: {
  images: (string | StaticImageData)[];
  alt: string;
}) {
  const [i, setI] = useState(0);

  return (
    <div className="relative">
      <div
        className="flex snap-x snap-mandatory overflow-x-auto"
        onScroll={(e) =>
          setI(
            Math.round(
              e.currentTarget.scrollLeft / e.currentTarget.clientWidth,
            ),
          )
        }
      >
        {images.map((src, n) => (
          <Image
            key={n}
            src={src}
            alt={`${alt} ${n + 1}`}
            loading={n ? "lazy" : "eager"}
            width={typeof src === "string" ? 800 : src.width}
            height={typeof src === "string" ? 800 : src.height}
            className="aspect-square w-full shrink-0 snap-center object-cover"
          />
        ))}
      </div>

      <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
        {images.map((_, n) => (
          <span
            key={n}
            className={`h-1.5 rounded-full bg-card transition-all ${
              n === i ? "w-5" : "w-1.5 opacity-60"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
