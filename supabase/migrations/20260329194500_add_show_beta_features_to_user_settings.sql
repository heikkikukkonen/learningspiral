alter table public.user_settings
add column if not exists show_beta_features boolean not null default false;
