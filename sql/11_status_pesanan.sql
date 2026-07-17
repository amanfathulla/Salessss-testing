-- 11_status_pesanan.sql
-- Tambah column status ke table pesanan
-- JALAN DI SUPABASE SQL EDITOR (satu fail sahaja)

-- Tambah column status (default: proses)
alter table public.pesanan add column if not exists status text not null default 'proses';

-- Update existing records kepada 'proses'
update public.pesanan set status = 'proses' where status is null or status = '';
