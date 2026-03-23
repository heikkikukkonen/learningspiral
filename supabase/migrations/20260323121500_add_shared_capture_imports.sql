create table if not exists public.shared_capture_imports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  file_name text not null,
  mime_type text not null,
  file_size integer not null,
  base64_data text not null,
  shared_title text,
  shared_text text,
  shared_url text,
  created_at timestamptz not null default now()
);

create index if not exists idx_shared_capture_imports_user_created
  on public.shared_capture_imports(user_id, created_at desc);

alter table public.shared_capture_imports enable row level security;

drop policy if exists "shared_capture_imports are owner scoped" on public.shared_capture_imports;
create policy "shared_capture_imports are owner scoped"
on public.shared_capture_imports
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
