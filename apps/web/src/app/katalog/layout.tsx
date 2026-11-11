import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Katalog Kue — Cake, Pastry, Cookies, Hampers",
  description: "Lihat semua produk kami dan pesan langsung lewat WhatsApp.",
  openGraph: {
    title: "Katalog Kue",
    description: "Cake, pastry, cookies, dan hampers siap pesan.",
  },
};

export default function KatalogLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
