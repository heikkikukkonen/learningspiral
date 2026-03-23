do $$
begin
  if not exists (
    select 1
    from pg_enum
    where enumtypid = 'public.card_type'::regtype
      and enumlabel = 'custom'
  ) then
    alter type public.card_type add value 'custom';
  end if;
end $$;
