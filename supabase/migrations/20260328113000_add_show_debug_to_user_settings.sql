alter table public.user_settings
add column if not exists show_debug boolean not null default false;
