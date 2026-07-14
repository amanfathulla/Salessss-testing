-- 00_init.sql  (JALAN SEKALI SAHAJA di Supabase SQL Editor)
-- Schema penuh sistem Sales: produk, pelanggan, pesanan, item_pesanan, rekod_tahunan.
-- Semua column (kos, lokasi, kos_satuan, untung) terus dalam CREATE — tiada alter berasingan.

-- ============ produk ============
create table if not exists public.produk (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  harga numeric(12,2) not null default 0,
  kos numeric(12,2) not null default 0,
  stok integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.produk enable row level security;
drop policy if exists "produk_all" on public.produk;
create policy "produk_all" on public.produk for all using (true) with check (true);

-- ============ pelanggan ============
create table if not exists public.pelanggan (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  phone text,
  email text,
  lokasi text,
  created_at timestamptz not null default now()
);
alter table public.pelanggan enable row level security;
drop policy if exists "pelanggan_all" on public.pelanggan;
create policy "pelanggan_all" on public.pelanggan for all using (true) with check (true);

-- ============ pesanan ============
create table if not exists public.pesanan (
  id uuid primary key default gen_random_uuid(),
  pelanggan_id uuid references public.pelanggan(id) on delete set null,
  tarikh timestamptz not null default now(),
  jumlah numeric(12,2) not null default 0,
  catatan text,
  created_at timestamptz not null default now()
);
create index if not exists idx_pesanan_tarikh on public.pesanan (tarikh);
alter table public.pesanan enable row level security;
drop policy if exists "pesanan_all" on public.pesanan;
create policy "pesanan_all" on public.pesanan for all using (true) with check (true);

-- ============ item_pesanan ============
create table if not exists public.item_pesanan (
  id uuid primary key default gen_random_uuid(),
  pesanan_id uuid not null references public.pesanan(id) on delete cascade,
  produk_id uuid references public.produk(id) on delete set null,
  nama_produk text not null,
  kuantiti integer not null default 1,
  harga_satuan numeric(12,2) not null default 0,
  kos_satuan numeric(12,2) not null default 0,
  subtotal numeric(12,2) not null default 0,
  untung numeric(12,2) not null default 0
);
alter table public.item_pesanan enable row level security;
drop policy if exists "item_pesanan_all" on public.item_pesanan;
create policy "item_pesanan_all" on public.item_pesanan for all using (true) with check (true);

-- ============ rekod_tahunan ============
-- 2026 (tahun semasa) dikira AUTO dari pesanan; 2025 (atau lain) diisi MANUAL di sini.
create table if not exists public.rekod_tahunan (
  id uuid primary key default gen_random_uuid(),
  tahun integer not null unique,
  jualan numeric(14,2) not null default 0,
  untung numeric(14,2) not null default 0,
  catatan text
);
alter table public.rekod_tahunan enable row level security;
drop policy if exists "rekod_tahunan_all" on public.rekod_tahunan;
create policy "rekod_tahunan_all" on public.rekod_tahunan for all using (true) with check (true);

-- ============ RLS BERKUNCI (pilihan) ============
-- Untuk kunci akses kepada user LOG MASUK sahaja, uncomment blok di bawah
-- SELEPAS ada akaun Supabase Auth. Selagi tiada login, biarkan 'using (true)' di atas.
--
-- drop policy if exists "produk_all" on public.produk;
-- create policy "produk_auth" on public.produk for all using (auth.uid() is not null) with check (auth.uid() is not null);
-- drop policy if exists "pelanggan_all" on public.pelanggan;
-- create policy "pelanggan_auth" on public.pelanggan for all using (auth.uid() is not null) with check (auth.uid() is not null);
-- drop policy if exists "pesanan_all" on public.pesanan;
-- create policy "pesanan_auth" on public.pesanan for all using (auth.uid() is not null) with check (auth.uid() is not null);
-- drop policy if exists "item_pesanan_all" on public.item_pesanan;
-- create policy "item_pesanan_auth" on public.item_pesanan for all using (auth.uid() is not null) with check (auth.uid() is not null);
-- drop policy if exists "rekod_tahunan_all" on public.rekod_tahunan;
-- create policy "rekod_tahunan_auth" on public.rekod_tahunan for all using (auth.uid() is not null) with check (auth.uid() is not null);
