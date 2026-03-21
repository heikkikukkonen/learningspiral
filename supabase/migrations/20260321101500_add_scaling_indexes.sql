create index if not exists idx_cards_user_source_created
  on public.cards(user_id, source_id, created_at desc);

create index if not exists idx_learning_events_user_entity_created
  on public.learning_events(user_id, entity_id, created_at desc);

create index if not exists idx_learning_events_user_event_created
  on public.learning_events(user_id, event_type, created_at desc);

create index if not exists idx_capture_messages_user_source_created
  on public.capture_messages(user_id, source_id, created_at asc);

create index if not exists idx_capture_assets_user_source_created
  on public.capture_assets(user_id, source_id, created_at asc);

create index if not exists idx_review_logs_card
  on public.review_logs(card_id);
