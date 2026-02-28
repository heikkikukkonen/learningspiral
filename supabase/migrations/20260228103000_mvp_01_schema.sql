create extension if not exists "pgcrypto";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'source_type') then
    create type public.source_type as enum (
      'book',
      'podcast',
      'conversation',
      'thought',
      'article',
      'video',
      'other'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'summary_source_type') then
    create type public.summary_source_type as enum ('manual', 'chatgpt');
  end if;

  if not exists (select 1 from pg_type where typname = 'card_status') then
    create type public.card_status as enum ('suggested', 'active', 'rejected');
  end if;

  if not exists (select 1 from pg_type where typname = 'card_type') then
    create type public.card_type as enum ('recall', 'apply', 'reflect');
  end if;
end $$;

create table if not exists public.sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  type public.source_type not null,
  title text not null,
  author text,
  origin text,
  published_at date,
  url text,
  tags text[] default '{}'::text[],
  created_at timestamptz not null default now()
);

create table if not exists public.summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  source_id uuid not null references public.sources(id) on delete cascade,
  content text not null,
  source public.summary_source_type not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_id)
);

create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  source_id uuid not null references public.sources(id) on delete cascade,
  summary_id uuid references public.summaries(id) on delete set null,
  status public.card_status not null default 'suggested',
  card_type public.card_type not null,
  prompt text not null,
  answer text not null,
  due_at timestamptz,
  interval_days integer not null default 0,
  ease double precision not null default 2.5,
  reps integer not null default 0,
  lapses integer not null default 0,
  last_reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.review_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  card_id uuid not null references public.cards(id) on delete cascade,
  rating integer not null check (rating between 1 and 4),
  reviewed_at timestamptz not null default now()
);

create index if not exists idx_sources_user_created on public.sources(user_id, created_at desc);
create index if not exists idx_cards_user_due_active on public.cards(user_id, due_at) where status = 'active';
create index if not exists idx_cards_source on public.cards(source_id);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_summaries_updated_at on public.summaries;
create trigger trg_summaries_updated_at
before update on public.summaries
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_cards_updated_at on public.cards;
create trigger trg_cards_updated_at
before update on public.cards
for each row execute procedure public.set_updated_at();

alter table public.sources enable row level security;
alter table public.summaries enable row level security;
alter table public.cards enable row level security;
alter table public.review_logs enable row level security;

drop policy if exists "sources are owner scoped" on public.sources;
create policy "sources are owner scoped"
on public.sources
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "summaries are owner scoped" on public.summaries;
create policy "summaries are owner scoped"
on public.summaries
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "cards are owner scoped" on public.cards;
create policy "cards are owner scoped"
on public.cards
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "review_logs are owner scoped" on public.review_logs;
create policy "review_logs are owner scoped"
on public.review_logs
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
