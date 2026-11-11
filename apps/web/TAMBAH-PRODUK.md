# Panduan Menambah Produk Katalog

Semua data toko ada di **`src/config/store.ts`**. Tidak perlu database.

## 1. Siapkan foto
- Format `.jpg`, rasio persegi (mis. 1000×1000), ukuran < 300 KB.
- Simpan ke folder `src/assets/`, contoh: `src/assets/brownies.jpg`.

## 2. Import foto
Di bagian atas `src/config/store.ts`:
```ts
import brownies from "@/assets/brownies.jpg";
```

## 3. Tambahkan produk
Salin template ini ke dalam daftar `PRODUCTS`:
```ts
{
  id: "fudgy-brownies-16",          // unik, huruf kecil, pakai "-"
  name: "Fudgy Brownies (16 pcs)",
  category: "cookies",              // cake | pastry | cookies | hampers
  price: 150000,                    // angka tanpa titik
  image: brownies,
  description: "Brownies pekat dengan kulit mengilap.",
  customizable: false,              // true = ada tombol Kustomisasi
  images: [brownies],               // opsional, foto galeri tambahan
},
```

## 4. (Opsional) Kategori baru
Tambahkan ke `CATEGORIES`: `{ id: "roti", name: "Roti", image: fotoRoti }`,
lalu pakai `category: "roti"` di produk.

## 5. Opsi kustomisasi
Rasa, ukuran, dan dekorasi (beserta harga tambahan) diatur di `CUSTOM_OPTIONS`.

## Cek
- `id` tidak boleh sama dengan produk lain.
- Jangan lupa tanda koma `,` setelah `}` tiap produk.
- Produk otomatis muncul di katalog, pencarian, kategori, dan halaman detail.

## 6. Bahan & fun fact
Default per kategori ada di `CATEGORY_INFO`. Untuk produk tertentu, tambahkan:
```ts
ingredients: ["Mentega asli", "Matcha Uji"],
funFact: "Teks fun fact khusus produk ini.",
```
