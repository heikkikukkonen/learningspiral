alter table public.user_settings
add column if not exists thought_network_layout jsonb not null default '{}'::jsonb;
