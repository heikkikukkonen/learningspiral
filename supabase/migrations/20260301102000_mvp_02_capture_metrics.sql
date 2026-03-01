do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'input_modality'
      and n.nspname = 'public'
  ) then
    create type public.input_modality as enum ('text', 'image', 'audio', 'mixed');
  end if;
end $$;

alter table public.sources
  add column if not exists capture_mode text not null default 'manual';

alter table public.summaries
  add column if not exists raw_input text,
  add column if not exists input_modality public.input_modality not null default 'text';

alter table public.cards
  add column if not exists generation_model text,
  add column if not exists generation_context jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'card_type'
      and n.nspname = 'public'
  ) then
    create type public.card_type as enum ('recall', 'apply', 'reflect');
  end if;

  if not exists (
    select 1
    from pg_enum
    where enumtypid = 'public.card_type'::regtype
      and enumlabel = 'decision'
  ) then
    alter type public.card_type add value 'decision';
  end if;
end $$;

create table if not exists public.capture_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  source_id uuid not null references public.sources(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.learning_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  event_type text not null,
  entity_id uuid,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.applied_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  card_id uuid references public.cards(id) on delete set null,
  source_id uuid references public.sources(id) on delete set null,
  note text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.learning_daily_metrics (
  user_id uuid not null,
  date date not null,
  reviews_count integer not null default 0,
  accepted_count integer not null default 0,
  applied_count integer not null default 0,
  lms_score double precision not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

create index if not exists idx_capture_messages_source_created
  on public.capture_messages(source_id, created_at asc);
create index if not exists idx_learning_events_user_created
  on public.learning_events(user_id, created_at desc);
create index if not exists idx_applied_insights_user_created
  on public.applied_insights(user_id, created_at desc);
create index if not exists idx_learning_daily_metrics_user_date
  on public.learning_daily_metrics(user_id, date desc);

drop trigger if exists trg_learning_daily_metrics_updated_at on public.learning_daily_metrics;
create trigger trg_learning_daily_metrics_updated_at
before update on public.learning_daily_metrics
for each row execute procedure public.set_updated_at();

alter table public.capture_messages enable row level security;
alter table public.learning_events enable row level security;
alter table public.applied_insights enable row level security;
alter table public.learning_daily_metrics enable row level security;

drop policy if exists "capture_messages are owner scoped" on public.capture_messages;
create policy "capture_messages are owner scoped"
on public.capture_messages
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "learning_events are owner scoped" on public.learning_events;
create policy "learning_events are owner scoped"
on public.learning_events
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "applied_insights are owner scoped" on public.applied_insights;
create policy "applied_insights are owner scoped"
on public.applied_insights
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "learning_daily_metrics are owner scoped" on public.learning_daily_metrics;
create policy "learning_daily_metrics are owner scoped"
on public.learning_daily_metrics
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
