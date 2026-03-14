create table if not exists public.capture_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  source_id uuid not null references public.sources(id) on delete cascade,
  kind text not null check (kind in ('image', 'audio')),
  file_name text not null,
  mime_type text not null,
  file_size integer not null,
  base64_data text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_capture_assets_source_created
  on public.capture_assets(source_id, created_at asc);

alter table public.capture_assets enable row level security;

drop policy if exists "capture_assets are owner scoped" on public.capture_assets;
create policy "capture_assets are owner scoped"
on public.capture_assets
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
