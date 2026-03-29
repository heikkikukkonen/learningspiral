alter table public.sources
  add column if not exists review_due_at timestamptz not null default now();

update public.sources
set review_due_at = coalesce(review_due_at, now());

create index if not exists idx_sources_user_review_due_at
  on public.sources(user_id, review_due_at);
