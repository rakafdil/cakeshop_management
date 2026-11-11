import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Keranjang — Checkout via WhatsApp",
  description: "Cek pesananmu dan kirim langsung lewat WhatsApp.",
  openGraph: {
    title: "Keranjang",
    description: "Checkout pesanan kue via WhatsApp.",
  },
};

export default function CartLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
