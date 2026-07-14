-- 09_storage_settings.sql  (jalan SELEPAS 00_init.sql)
-- Simpan banner / logo / nama syarikat ke SQL (bukan localStorage)
-- supaya seragam untuk semua peranti. Imej disimpan di Supabase Storage.

-- 1) Bucket storage untuk imej (banner, logo)
--    Jika gagal, cipta manual di Supabase → Storage → New bucket → "assets" (Public).
insert into storage.buckets (id, name, public)
values ('assets', 'assets', true)
on conflict (id) do nothing;

-- Polisi akses bucket (admin tunggal: benarkan semua)
drop policy if exists "assets_all" on storage.objects;
create policy "assets_all" on storage.objects for all
  using (bucket_id = 'assets') with check (bucket_id = 'assets');

-- 2) Table settings (1 baris sahaja, id = 'default')
create table if not exists public.settings (
  id text primary key default 'default',
  company text,
  banner_url text,
  logo_url text
);

alter table public.settings enable row level security;
drop policy if exists "settings_all" on public.settings;
create policy "settings_all" on public.settings for all
  using (true) with check (true);

-- Isi row default kosong (supaya app boleh update).
insert into public.settings (id) values ('default') on conflict (id) do nothing;
