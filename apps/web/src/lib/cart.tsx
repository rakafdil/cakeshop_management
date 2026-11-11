"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { STORE, rupiah } from "@/config/store";

export type Custom = {
  flavor: string;
  size: string;
  decoration: string;
  message: string;
  date: string;
};

export type CartItem = {
  key: string;
  productId: string;
  name: string;
  unitPrice: number;
  qty: number;
  custom?: Custom;
};

type Ctx = {
  items: CartItem[];
  add: (item: Omit<CartItem, "key" | "qty">, qty?: number) => void;
  setQty: (key: string, qty: number) => void;
  count: number;
  total: number;
  bump: number;
};

const CartCtx = createContext<Ctx | null>(null);

const STORAGE_KEY = "cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [bump, setBump] = useState(0);
  const [hydrated, setHydrated] = useState(false);

  // Load cart from localStorage after mounting
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: CartItem[] = JSON.parse(stored);
        setItems(parsed);
      }
    } catch (error) {
      console.error("Failed to load cart:", error);
    } finally {
      setHydrated(true);
    }
  }, []);

  // Persist cart whenever items change
  useEffect(() => {
    if (!hydrated) return;

    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  const add: Ctx["add"] = (item, qty = 1) => {
    const key = item.custom
      ? `${item.productId}-${Date.now()}`
      : item.productId;

    setItems((prev) => {
      const existing = prev.find((x) => x.key === key);

      return existing
        ? prev.map((x) => (x.key === key ? { ...x, qty: x.qty + qty } : x))
        : [...prev, { ...item, key, qty }];
    });

    setBump((prev) => prev + 1);
  };

  const setQty: Ctx["setQty"] = (key, qty) => {
    setItems((prev) =>
      qty <= 0
        ? prev.filter((x) => x.key !== key)
        : prev.map((x) => (x.key === key ? { ...x, qty } : x)),
    );
  };

  const count = items.reduce((sum, item) => sum + item.qty, 0);
  const total = items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);

  return (
    <CartCtx.Provider value={{ items, add, setQty, count, total, bump }}>
      {children}
    </CartCtx.Provider>
  );
}

export function useCart() {
  const context = useContext(CartCtx);

  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }

  return context;
}

export function buildWhatsAppMessage(
  items: CartItem[],
  total: number,
  name: string,
  date: string,
) {
  const lines = [`Halo ${STORE.name}, saya ingin memesan:`, ""];

  items.forEach((item, index) => {
    lines.push(
      `${index + 1}. ${item.name} x${item.qty} — ${rupiah(item.unitPrice * item.qty)}`,
    );

    if (item.custom) {
      const custom = item.custom;

      lines.push(
        `   • Rasa: ${custom.flavor}`,
        `   • Ukuran: ${custom.size}`,
        `   • Dekorasi: ${custom.decoration}`,
      );

      if (custom.message) {
        lines.push(`   • Tulisan: "${custom.message}"`);
      }

      lines.push(`   • Tanggal: ${custom.date}`);
    }
  });

  lines.push("", `Total: ${rupiah(total)}`);

  if (date) lines.push(`Tanggal ambil/kirim: ${date}`);
  if (name) lines.push(`Nama: ${name}`);

  return `https://wa.me/${STORE.whatsapp}?text=${encodeURIComponent(lines.join("\n"))}`;
}
