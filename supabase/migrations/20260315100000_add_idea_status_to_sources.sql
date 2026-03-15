do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'idea_status'
      and n.nspname = 'public'
  ) then
    create type public.idea_status as enum (
      'draft',
      'refined_without_cards',
      'refined_with_cards'
    );
  end if;
end $$;

alter table public.sources
  add column if not exists idea_status public.idea_status not null default 'draft';

update public.sources
set idea_status = case
  when exists (
    select 1
    from public.cards
    where cards.source_id = sources.id
  ) then 'refined_with_cards'::public.idea_status
  when exists (
    select 1
    from public.summaries
    where summaries.source_id = sources.id
  ) then 'refined_without_cards'::public.idea_status
  else 'draft'::public.idea_status
end;
