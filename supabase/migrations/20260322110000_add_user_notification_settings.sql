create table if not exists public.user_notification_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  morning_reminder_enabled boolean not null default false,
  morning_reminder_time text not null default '08:00',
  morning_reminder_timezone text not null default 'UTC',
  last_morning_reminder_sent_for date,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists trg_user_notification_settings_updated_at on public.user_notification_settings;
create trigger trg_user_notification_settings_updated_at
before update on public.user_notification_settings
for each row execute procedure public.set_updated_at();

alter table public.user_notification_settings enable row level security;

drop policy if exists "user_notification_settings are owner scoped" on public.user_notification_settings;
create policy "user_notification_settings are owner scoped"
on public.user_notification_settings
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
