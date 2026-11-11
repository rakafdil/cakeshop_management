
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PRODUCTS, rupiah } from "@/config/store";
import ProductDetail from "./product-detail";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const product = PRODUCTS.find((p) => p.id === id);

  if (!product) {
    return {
      title: "Produk tidak ditemukan",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  return {
    title: `${product.name} — ${rupiah(product.price)}`,
    description: product.description,
    openGraph: {
      title: product.name,
      description: product.description,
    },
  };
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;

  const product = PRODUCTS.find((p) => p.id === id);

  if (!product) {
    notFound();
  }

  return <ProductDetail product={product} />;
}
