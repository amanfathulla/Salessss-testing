# Sistem Sales (Admin Sahaja)

Sistem jualan: **Dashboard** (graf + untung), **Produk**, **Pelanggan**, **Setting**.
Ada **login admin** (email + kata laluan), **5 tema warna**, dan **nama syarikat** boleh tukar.
Dibina dengan Vite + React + TypeScript + Supabase Auth.

## 1. Setup Supabase (sekali sahaja)

Buka Supabase project `uobueyudnehfrozzonnl` → **SQL Editor**, kemudian jalankan
fail SQL **satu per satu** (jangan paste semua sekali — editor akan potong):

1. `sql/00_init.sql`  ← SEMUA schema (produk, pelanggan, pesanan, item_pesanan, rekod_tahunan) dalam 1 fail

> Polisi RLS dibuka (`using (true)`) untuk admin tunggal. Tidak selamat untuk
> akses awam — kunci dengan `auth.uid()` (di hujung `00_init.sql`, dalam comment)
> bila ada multi-user / login wajib.

## 2. Setup .env

```bash
cp .env.example .env
```

Buka `.env` (Notepad) dan isi:

```
VITE_SUPABASE_URL=https://uobueyudnehfrozzonnl.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ....   # Supabase → Settings → API (anon key)
```

## 3. Aktifkan Authentication (untuk login)

Di Supabase dashboard:
- **Authentication → Providers → Email** → ON kan "Enable Email Signup".
- Cipta admin pertama: **Authentication → Users → Add user** (isi email + kata laluan,
  tick "Auto Confirm"). Atau guna borang **Daftar** di skrin login (perlu sahkan email).

## 4. Install & jalan

```bash
npm install
npm run dev
```

Buka http://localhost:8080 → Log Masuk dengan akaun admin.

## 5. Ciri

- **Login / Logout** — email + kata laluan (Supabase Auth).
- **Setting** — tukar email, tukar kata laluan, tukar **nama syarikat**, pilih **5 tema**.
- **Dashboard** — butang ✏️ sebelah tajuk untuk tukar nama syarikat terus.
- **Tema** disimpan per-peranti (localStorage). Nama syarikat juga per-peranti.

## 6. Build untuk production

```bash
npm run build
npm run preview
```

## Struktur DB

- `produk` (id, nama, harga, kos, stok)
- `pelanggan` (id, nama, phone, email, lokasi)
- `pesanan` (id, pelanggan_id, tarikh, jumlah, catatan)
- `item_pesanan` (id, pesanan_id, produk_id, nama_produk, kuantiti, harga_satuan, kos_satuan, subtotal, untung)
