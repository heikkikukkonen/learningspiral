alter table public.push_subscriptions
add column if not exists device_label text;
