-- ============ nota (Marketing Notes) ============
-- Simpan nota pemasaran / catatan bebas.
create table if not exists public.nota (
  id uuid primary key default gen_random_uuid(),
  tajuk text not null default '',
  isi text,
  created_at timestamptz not null default now()
);
create index if not exists idx_nota_created on public.nota (created_at desc);

alter table public.nota enable row level security;
drop policy if exists "nota_all" on public.nota;
create policy "nota_all" on public.nota for all using (true) with check (true);
