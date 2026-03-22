alter table public.push_subscriptions
add column if not exists last_morning_reminder_sent_for date,
add column if not exists last_error_at timestamptz,
add column if not exists last_error_message text;
