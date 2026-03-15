delete from public.learning_events
where event_type = 'insight_logged';

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'applied_insights'
  ) then
    drop policy if exists "applied_insights are owner scoped" on public.applied_insights;
  end if;
end $$;

drop table if exists public.applied_insights;
