// Ganti semua data toko di file ini (nama, WhatsApp, produk, harga).
import cake from "@/assets/cake.jpg";
import pastry from "@/assets/pastry.jpg";
import cookies from "@/assets/cookies.jpg";
import hero from "@/assets/hero.jpg";
import type { StaticImageData } from "next/image";
export const STORE = {
  name: "[Nama Toko]",
  tagline: "Kue rumahan, dibuat dengan hati",
  whatsapp: "6281234567890", // format internasional tanpa +
  city: "[Kota]",
  hours: "Setiap hari, 08.00–20.00",
  heroImage: hero,
};

export type Category = { id: string; name: string; image: StaticImageData };
export const CATEGORIES: Category[] = [
  { id: "cake", name: "Cake", image: cake },
  { id: "pastry", name: "Pastry", image: pastry },
  { id: "cookies", name: "Cookies", image: cookies },
  { id: "hampers", name: "Hampers", image: hero },
];

export type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  image: StaticImageData;
  description: string;
  customizable?: boolean;
  images?: StaticImageData[];
  ingredients?: string[];
  funFact?: string;
  unit?: string;
};

// ── CARA MENAMBAH PRODUK (lihat juga TAMBAH-PRODUK.md) ──
// 1. Taruh foto di src/assets/, lalu import di atas: import brownies from "@/assets/brownies.jpg";
// 2. Salin template di bawah ke dalam daftar PRODUCTS, isi datanya:
// {
//   id: "nama-produk-unik",        // huruf kecil & tanda "-", dipakai di link /produk/...
//   name: "Nama Produk",
//   category: "cake",              // salah satu id di CATEGORIES: cake | pastry | cookies | hampers
//   price: 100000,                 // angka saja, tanpa titik / "Rp"
//   image: brownies,               // foto utama
//   description: "Deskripsi singkat.",
//   customizable: false,           // true = muncul tombol "Kustomisasi"
//   images: [brownies, cake],      // opsional: foto tambahan di halaman detail
// },
export const PRODUCTS: Product[] = [
  {
    id: "strawberry-cake",
    name: "Strawberry Cream Cake",
    category: "cake",
    price: 285000,
    image: hero,
    description: "Sponge lembut, krim segar, dan stroberi pilihan.",
    customizable: true,
  },
  {
    id: "birthday-cake",
    name: "Birthday Rosette Cake",
    category: "cake",
    price: 250000,
    image: cake,
    description: "Buttercream rosette yang bisa dipersonalisasi.",
    customizable: true,
  },
  {
    id: "croissant",
    name: "Butter Croissant (isi 4)",
    category: "pastry",
    price: 68000,
    image: pastry,
    description: "Berlapis renyah dengan mentega Prancis.",
  },
  {
    id: "pain-choco",
    name: "Pain au Chocolat (isi 4)",
    category: "pastry",
    price: 76000,
    image: pastry,
    description: "Pastry renyah berisi cokelat hitam.",
  },
  {
    id: "choco-cookies",
    name: "Choco Chip Cookies (12 pcs)",
    category: "cookies",
    price: 55000,
    image: cookies,
    description: "Chewy di tengah, renyah di pinggir.",
  },
  {
    id: "fudgy-brownies",
    name: "Fudgy Brownies (9 pcs)",
    category: "cookies",
    price: 90000,
    image: cookies,
    description: "Brownies pekat dengan kulit mengilap.",
  },
  {
    id: "hampers-lebaran",
    name: "Hampers Spesial",
    category: "hampers",
    price: 350000,
    image: hero,
    description: "Paket cookies, pastry, dan kartu ucapan.",
    customizable: true,
  },
  {
    id: "mini-cake",
    name: "Mini Bento Cake",
    category: "cake",
    price: 120000,
    image: cake,
    description: "Kue mungil 10 cm, pas untuk berdua.",
    customizable: true,
  },
];

// Galeri: foto utama + foto tambahan (ganti dengan foto asli)
const extras: Record<string, StaticImageData[]> = {
  cake: [cake, hero],
  pastry: [pastry, cookies],
  cookies: [cookies, pastry],
  hampers: [cookies, pastry, cake],
};
export const productImages = (p: Product) => [
  p.image,
  ...(p.images ?? (extras[p.category] ?? []).filter((i) => i !== p.image)),
];

// Bahan & fun fact per kategori (tampil di halaman detail). Bisa diganti per produk lewat field "ingredients"/"funFact".
export const CATEGORY_INFO: Record<
  string,
  { ingredients: string[]; funFact: string }
> = {
  cake: {
    ingredients: [
      "Mentega asli Anchor",
      "Telur ayam kampung segar",
      "Whipping cream dairy",
      "Vanilla bean Madagaskar",
      "Buah segar lokal",
    ],
    funFact:
      "Sponge cake kami dikocok hingga 10 menit agar udara terperangkap — itu rahasia teksturnya yang ringan tanpa baking powder berlebih.",
  },
  pastry: {
    ingredients: [
      "Mentega Prancis (AOP)",
      "Tepung protein tinggi",
      "Cokelat hitam 54%",
      "Ragi alami",
      "Garam laut",
    ],
    funFact:
      "Satu croissant punya 27 lapisan mentega & adonan, dilipat selama 3 hari. Mentega asli membuatnya wangi — margarin tidak bisa meniru aromanya.",
  },
  cookies: {
    ingredients: [
      "Cokelat Belgia couverture",
      "Gula aren organik",
      "Mentega asli",
      "Tepung terigu premium",
      "Garam laut flake",
    ],
    funFact:
      "Adonan cookies kami diistirahatkan 24 jam di kulkas. Gula & tepung menyatu sempurna, hasilnya rasa karamel lebih dalam dan tekstur chewy.",
  },
  hampers: {
    ingredients: [
      "Cookies & pastry pilihan",
      "Toples kaca food-grade",
      "Kotak kraft daur ulang",
      "Kartu ucapan tulisan tangan",
    ],
    funFact:
      "Semua isi hampers dipanggang maksimal H-1 sebelum dikirim, jadi tetap fresh saat dibuka penerima.",
  },
};
export const productInfo = (p: Product) => ({
  ingredients: p.ingredients ?? CATEGORY_INFO[p.category]?.ingredients ?? [],
  funFact: p.funFact ?? CATEGORY_INFO[p.category]?.funFact,
});

export const CUSTOM_OPTIONS = {
  flavors: ["Vanilla", "Cokelat", "Red Velvet", "Pandan", "Stroberi"],
  sizes: [
    { label: "Mini 10 cm", extra: 0 },
    { label: "16 cm", extra: 75000 },
    { label: "20 cm", extra: 150000 },
    { label: "24 cm", extra: 250000 },
  ],
  decorations: [
    { label: "Simpel", extra: 0 },
    { label: "Bunga buttercream", extra: 40000 },
    { label: "Buah segar", extra: 50000 },
    { label: "Topper custom", extra: 35000 },
  ],
};

export const TESTIMONIALS = [
  {
    name: "Nadia",
    text: "Kuenya cantik banget dan rasanya nggak terlalu manis. Tamu pada nanya beli di mana!",
  },
  {
    name: "Rizky",
    text: "Pesan custom lewat WhatsApp gampang, datang tepat waktu untuk ulang tahun istri.",
  },
  {
    name: "Sari",
    text: "Croissant-nya juara, renyah dan wangi mentega. Langganan tiap minggu.",
  },
];

export const rupiah = (n: number) => "Rp" + n.toLocaleString("id-ID");
