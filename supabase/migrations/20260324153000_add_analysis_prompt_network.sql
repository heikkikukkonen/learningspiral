alter table public.user_settings
  add column if not exists analysis_prompt_network text not null default '';
