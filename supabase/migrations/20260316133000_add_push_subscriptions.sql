create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  endpoint text not null unique,
  subscription_json jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_sent_at timestamptz
);

create index if not exists idx_push_subscriptions_user_created
on public.push_subscriptions(user_id, created_at desc);

drop trigger if exists trg_push_subscriptions_updated_at on public.push_subscriptions;
create trigger trg_push_subscriptions_updated_at
before update on public.push_subscriptions
for each row execute procedure public.set_updated_at();

alter table public.push_subscriptions enable row level security;

drop policy if exists "push_subscriptions are owner scoped" on public.push_subscriptions;
create policy "push_subscriptions are owner scoped"
on public.push_subscriptions
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
