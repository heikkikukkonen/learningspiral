alter table public.user_settings
  add column if not exists tag_generation_prompt text not null default '';
