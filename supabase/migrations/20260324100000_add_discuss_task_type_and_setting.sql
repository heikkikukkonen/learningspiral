alter table public.user_settings
  add column if not exists discuss_card_generation_prompt text not null
  default 'Luo tehtava joka kannustaa minua loytamaan jonkun ystavan tai asiantuntijan kenen kanssa voisin keskustella aiheesta syventaakseni ymmarrysta asiasta.';

do $$
begin
  if not exists (
    select 1
    from pg_enum
    where enumtypid = 'public.card_type'::regtype
      and enumlabel = 'discuss'
  ) then
    alter type public.card_type add value 'discuss';
  end if;
end $$;
