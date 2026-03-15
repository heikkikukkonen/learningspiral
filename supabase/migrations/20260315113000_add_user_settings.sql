create table if not exists public.user_settings (
  user_id uuid primary key,
  response_language text not null default 'Finnish',
  analysis_prompt_refresh text not null default '',
  analysis_prompt_deepen text not null default '',
  analysis_prompt_summarize text not null default '',
  card_generation_prompt text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_user_settings_updated_at on public.user_settings;
create trigger trg_user_settings_updated_at
before update on public.user_settings
for each row execute procedure public.set_updated_at();

alter table public.user_settings enable row level security;

drop policy if exists "user_settings are owner scoped" on public.user_settings;
create policy "user_settings are owner scoped"
on public.user_settings
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
