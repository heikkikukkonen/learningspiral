alter table public.user_settings
  add column if not exists recall_card_generation_prompt text not null default '',
  add column if not exists apply_card_generation_prompt text not null default '',
  add column if not exists reflect_card_generation_prompt text not null default '';

update public.user_settings
set
  recall_card_generation_prompt = case
    when recall_card_generation_prompt = '' then card_generation_prompt
    else recall_card_generation_prompt
  end,
  apply_card_generation_prompt = case
    when apply_card_generation_prompt = '' then card_generation_prompt
    else apply_card_generation_prompt
  end,
  reflect_card_generation_prompt = case
    when reflect_card_generation_prompt = '' then card_generation_prompt
    else reflect_card_generation_prompt
  end
where coalesce(card_generation_prompt, '') <> '';

update public.cards
set
  status = 'active',
  due_at = coalesce(due_at, now())
where status = 'suggested';
