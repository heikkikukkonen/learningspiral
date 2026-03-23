alter table public.user_notification_settings
drop column if exists last_morning_reminder_sent_for;

alter table public.push_subscriptions
drop column if exists last_morning_reminder_sent_for;
