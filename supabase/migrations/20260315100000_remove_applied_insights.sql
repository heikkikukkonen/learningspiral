delete from public.learning_events
where event_type = 'insight_logged';

drop policy if exists "applied_insights are owner scoped" on public.applied_insights;
drop table if exists public.applied_insights;
