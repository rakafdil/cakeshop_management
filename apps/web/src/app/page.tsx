import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Quote,
  Star,
  Leaf,
  Clock,
  Truck,
  Heart,
  MessageCircle,
  ChevronDown,
} from "lucide-react";

import {
  STORE,
  CATEGORIES,
  TESTIMONIALS,
  PRODUCTS,
  rupiah,
} from "@/config/store";

import RevealInit from "@/components/reveal-init";
import Image from "next/image";

export const metadata: Metadata = {
  title: `${STORE.name} — Kue Rumahan & Custom Cake`,
  description:
    "Toko kue rumahan: cake, pastry, cookies, hampers, dan kue custom. Fresh tiap hari, pesan mudah lewat WhatsApp.",
  openGraph: {
    title: `${STORE.name} — Kue Rumahan & Custom Cake`,
    description:
      "Cake, pastry, cookies, dan kue custom. Fresh tiap hari, pesan lewat WhatsApp.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
};

const BEST = [
  "strawberry-cake",
  "croissant",
  "choco-cookies",
  "hampers-lebaran",
];

const WHY = [
  {
    icon: Leaf,
    t: "Bahan premium",
    d: "Mentega asli, cokelat Belgia, buah segar. Tanpa pengawet.",
  },
  {
    icon: Clock,
    t: "Dibuat saat dipesan",
    d: "Dipanggang di hari pengiriman supaya tetap fresh.",
  },
  {
    icon: Heart,
    t: "Bisa custom",
    d: "Pilih rasa, ukuran, dekorasi, dan tulisan sesukamu.",
  },
  {
    icon: Truck,
    t: "Antar ke rumah",
    d: `Kirim same-day area ${STORE.city}, dikemas aman.`,
  },
];

const STEPS = [
  ["Pilih kue", "Belanja dari katalog atau rancang kue custom."],
  ["Checkout", "Isi keranjang, lalu tekan Pesan via WhatsApp."],
  ["Konfirmasi", "Kami cek pesanan & kirim total ongkir."],
  ["Terima kue", "Kue fresh diantar sesuai jadwalmu."],
];

const FAQ = [
  [
    "Berapa lama sebelumnya harus pesan?",
    "Produk katalog bisa H-1. Kue custom minimal H-2, hampers jumlah besar H-5.",
  ],
  [
    "Apakah bisa kirim ke luar kota?",
    "Cookies & hampers bisa dikirim ke luar kota. Cake hanya untuk area dalam kota.",
  ],
  [
    "Bagaimana cara bayar?",
    "Transfer bank atau e-wallet setelah pesanan dikonfirmasi lewat WhatsApp.",
  ],
  [
    "Kue tahan berapa lama?",
    "Cake 2–3 hari di kulkas, pastry 1 hari, cookies hingga 2 minggu dalam toples tertutup.",
  ],
];

export default function Landing() {
  const best = BEST.map((id) => PRODUCTS.find((p) => p.id === id)).filter(
    (p) => p !== undefined,
  );

  const minPrice = Math.min(...PRODUCTS.map((p) => p.price));

  return (
    <div className="bg-background text-foreground">
      <RevealInit />

      <div className="bg-accent px-4 py-2 text-center text-xs font-semibold text-accent-foreground">
        🎉 Gratis kartu ucapan untuk setiap kue custom · Pesan H-2
      </div>

      <section className="relative h-[88svh] min-h-[560px] overflow-hidden">
        <Image
          src={STORE.heroImage}
          alt="Kue stroberi"
          width={800}
          height={800}
          className="hero-zoom absolute inset-0 h-full w-full object-cover"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/40 to-transparent" />

        <div className="relative flex h-full flex-col justify-between p-6 text-primary-foreground">
          <p className="font-display text-xl">{STORE.name}</p>

          <div className="intro max-w-xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary-foreground/15 px-3 py-1 text-xs backdrop-blur">
              <Star className="h-3.5 w-3.5 fill-current" />
              4.9 dari 500+ pelanggan di {STORE.city}
            </div>

            <h1 className="font-display text-5xl leading-[0.95] sm:text-7xl">
              Kue yang dibuat untuk dirayakan.
            </h1>

            <p className="mt-4 max-w-md text-base opacity-90">
              Cake, pastry, cookies & hampers rumahan — dipanggang fresh setiap
              hari. Mulai {rupiah(minPrice)}.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/katalog"
                className="flex items-center justify-center gap-2 rounded-full bg-primary-foreground px-6 py-4 font-bold text-primary"
              >
                Lihat Katalog
                <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                href="/custom"
                className="rounded-full border border-primary-foreground/60 px-6 py-4 text-center font-bold"
              >
                Pesan Custom
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl grid-cols-2 gap-3 px-6 py-14 md:grid-cols-4">
        {WHY.map(({ icon: I, t, d }) => (
          <div key={t} className="reveal rounded-3xl bg-secondary p-5">
            <I className="h-6 w-6 text-accent" />
            <p className="mt-3 font-display text-lg leading-tight">{t}</p>
            <p className="mt-1 text-sm text-muted-foreground">{d}</p>
          </div>
        ))}
      </section>

      <section className="pb-16">
        <div className="mx-auto flex max-w-5xl items-end justify-between px-6">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-accent">
              Paling laris
            </p>
            <h2 className="reveal mt-2 font-display text-3xl">
              Favorit pelanggan
            </h2>
          </div>

          <Link href="/katalog" className="text-sm font-semibold text-accent">
            Semua →
          </Link>
        </div>

        <div className="mx-auto mt-6 grid max-w-5xl grid-cols-2 gap-4 px-6 md:grid-cols-4">
          {best.map((p, i) => (
            <Link key={p.id} href={`/produk/${p.id}`} className="reveal group">
              <div className="relative overflow-hidden rounded-3xl">
                <Image
                  src={p.image}
                  alt={p.name}
                  loading="lazy"
                  width={800}
                  height={800}
                  className="aspect-square w-full object-cover transition-transform group-hover:scale-105"
                />

                {i === 0 && (
                  <span className="absolute left-3 top-3 rounded-full bg-accent px-2.5 py-1 text-[10px] font-bold uppercase text-accent-foreground">
                    Best seller
                  </span>
                )}
              </div>

              <p className="mt-3 font-semibold leading-tight">{p.name}</p>
              <p className="text-sm text-muted-foreground">{rupiah(p.price)}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="pb-20">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="font-display text-3xl">Belanja per kategori</h2>
        </div>

        <div className="mx-auto mt-8 flex max-w-5xl snap-x gap-4 overflow-x-auto overflow-y-hidden px-6">
          {CATEGORIES.map((c) => {
            const items = PRODUCTS.filter((p) => p.category === c.id);

            return (
              <Link
                key={c.id}
                href={`/katalog?kategori=${encodeURIComponent(c.id)}`}
                className="reveal relative w-56 shrink-0 snap-center overflow-hidden rounded-3xl"
              >
                <Image
                  src={c.image}
                  alt={c.name}
                  loading="lazy"
                  width={800}
                  height={800}
                  className="aspect-[3/4] w-full object-cover"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-primary/80 to-transparent" />

                <div className="absolute bottom-4 left-4 text-primary-foreground">
                  <p className="font-display text-2xl">{c.name}</p>
                  <p className="text-xs opacity-80">
                    {items.length} produk · mulai{" "}
                    {rupiah(Math.min(...items.map((p) => p.price)))}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="bg-primary px-6 py-20 text-primary-foreground">
        <div className="mx-auto grid max-w-5xl items-center gap-10 md:grid-cols-2">
          <Image
            src={CATEGORIES[0]?.image ?? STORE.heroImage}
            alt="Kue custom"
            loading="lazy"
            width={800}
            height={800}
            className="reveal aspect-[4/5] w-full rounded-3xl object-cover"
          />

          <div>
            <p className="text-xs uppercase tracking-[0.3em] opacity-70">
              Kue custom
            </p>

            <h2 className="reveal mt-3 font-display text-4xl leading-tight">
              Ulang tahun, anniversary, lamaran — rancang kuemu sendiri.
            </h2>

            <ul className="mt-6 space-y-2 text-sm opacity-90">
              <li>
                ✓ 5 pilihan rasa: vanilla, cokelat, red velvet, pandan, stroberi
              </li>
              <li>✓ Ukuran 10–24 cm, cukup untuk 2 hingga 30 orang</li>
              <li>✓ Dekorasi bunga buttercream, buah segar, atau topper</li>
              <li>✓ Tulisan & kartu ucapan gratis</li>
            </ul>

            <Link
              href="/custom"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary-foreground px-6 py-4 font-bold text-primary"
            >
              Mulai rancang
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-20">
        <p className="text-xs uppercase tracking-[0.3em] text-accent">
          Cara pesan
        </p>

        <h2 className="reveal mt-2 font-display text-3xl">
          Gampang, cuma 4 langkah
        </h2>

        <ol className="mt-8 grid gap-4 md:grid-cols-4">
          {STEPS.map(([t, d], i) => (
            <li key={t} className="reveal rounded-3xl border p-5">
              <span className="font-display text-3xl text-accent">
                0{i + 1}
              </span>
              <p className="mt-2 font-semibold">{t}</p>
              <p className="mt-1 text-sm text-muted-foreground">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-3xl px-6 pb-20">
        <p className="text-xs uppercase tracking-[0.3em] text-accent">
          Cerita kami
        </p>

        <h2 className="reveal mt-4 font-display text-4xl leading-tight">
          Dari dapur kecil, untuk momen-momen besarmu.
        </h2>

        <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
          {STORE.name} berawal dari resep keluarga dan oven rumahan. Kami
          memanggang setiap pesanan dalam jumlah kecil, memakai mentega asli,
          buah segar, dan cokelat berkualitas — tanpa pengawet.
        </p>

        <div className="mt-10 grid grid-cols-3 gap-4 border-t pt-8 text-center">
          {[
            ["500+", "Pelanggan puas"],
            ["H-2", "Pesan custom"],
            ["4.9★", "Rating"],
          ].map(([a, b]) => (
            <div key={b}>
              <p className="font-display text-3xl text-primary">{a}</p>
              <p className="mt-1 text-xs text-muted-foreground">{b}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-secondary px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="font-display text-3xl">Kata mereka</h2>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <figure key={t.name} className="reveal rounded-3xl bg-card p-6">
                <div className="flex items-center justify-between">
                  <Quote className="h-6 w-6 text-accent" />
                  <span className="flex text-accent">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-current" />
                    ))}
                  </span>
                </div>

                <blockquote className="mt-3 leading-relaxed">
                  {t.text}
                </blockquote>

                <figcaption className="mt-4 text-sm font-semibold text-muted-foreground">
                  — {t.name}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-20">
        <h2 className="font-display text-3xl">Pertanyaan umum</h2>

        <div className="mt-6 divide-y border-y">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between font-semibold">
                {q}
                <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
              </summary>

              <p className="mt-2 text-sm text-muted-foreground">{a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="px-6 pb-20 text-center">
        <h2 className="reveal mx-auto max-w-xl font-display text-4xl leading-tight">
          Punya momen spesial? Kami bikinkan kuenya.
        </h2>

        <div className="mx-auto mt-8 flex max-w-md flex-col gap-3">
          <Link
            href="/katalog"
            className="rounded-full bg-accent px-6 py-4 font-bold text-accent-foreground"
          >
            Belanja Sekarang
          </Link>

          <a
            href={`https://wa.me/${STORE.whatsapp}`}
            className="flex items-center justify-center gap-2 rounded-full border px-6 py-4 font-bold"
          >
            <MessageCircle className="h-4 w-4" />
            Tanya via WhatsApp
          </a>
        </div>
      </section>

      <footer className="bg-primary px-6 py-10 pb-28 text-sm text-primary-foreground/80">
        <p className="font-display text-xl text-primary-foreground">
          {STORE.name}
        </p>
        <p className="mt-2">
          {STORE.city} · {STORE.hours}
        </p>
        <a
          href={`https://wa.me/${STORE.whatsapp}`}
          className="mt-1 block underline"
        >
          WhatsApp +{STORE.whatsapp}
        </a>
      </footer>
    </div>
  );
}
