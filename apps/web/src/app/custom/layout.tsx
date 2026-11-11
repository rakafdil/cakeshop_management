import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pesan Kue Custom — Pilih Rasa, Ukuran & Dekorasi",
  description:
    "Buat kue custom untuk ulang tahun dan momen spesial. Pesan minimal H-2.",
  openGraph: {
    title: "Pesan Kue Custom",
    description: "Pilih rasa, ukuran, dekorasi, tulisan, dan tanggal.",
  },
};

export default function CustomLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
