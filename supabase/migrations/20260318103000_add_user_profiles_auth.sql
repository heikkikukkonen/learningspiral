create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text not null default '',
  motivation text not null default '',
  activated_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_user_profiles_updated_at on public.user_profiles;
create trigger trg_user_profiles_updated_at
before update on public.user_profiles
for each row execute procedure public.set_updated_at();

create or replace function public.sync_user_profile_from_auth()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (
    user_id,
    email,
    full_name,
    motivation,
    activated_at
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'motivation', ''),
    new.email_confirmed_at
  )
  on conflict (user_id) do update
  set
    email = excluded.email,
    full_name = excluded.full_name,
    motivation = excluded.motivation,
    activated_at = excluded.activated_at;

  return new;
end;
$$;

drop trigger if exists trg_sync_user_profile_from_auth on auth.users;
create trigger trg_sync_user_profile_from_auth
after insert or update on auth.users
for each row execute procedure public.sync_user_profile_from_auth();

insert into public.user_profiles (user_id, email, full_name, motivation, activated_at)
select
  users.id,
  users.email,
  coalesce(users.raw_user_meta_data ->> 'full_name', ''),
  coalesce(users.raw_user_meta_data ->> 'motivation', ''),
  users.email_confirmed_at
from auth.users as users
on conflict (user_id) do update
set
  email = excluded.email,
  full_name = excluded.full_name,
  motivation = excluded.motivation,
  activated_at = excluded.activated_at;

alter table public.user_profiles enable row level security;

drop policy if exists "user_profiles are owner scoped" on public.user_profiles;
create policy "user_profiles are owner scoped"
on public.user_profiles
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
