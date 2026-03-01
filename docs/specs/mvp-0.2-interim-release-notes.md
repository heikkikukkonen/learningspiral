# MVP 0.2 Interim Release Notes (2026-03-01)

## Scope

Implemented from specs:

- `docs/specs/mvp-0.2-agentic-capture-and-review.md`
- `docs/specs/metrics-and-progress-curve-v1.md`

## Included in this release

1. Capture flow:
- new `/capture` page
- source creation from capture input
- capture conversation persisted to `capture_messages`
- summary draft persisted from capture flow

2. Review task generation:
- suggested cards include `recall`, `apply`, `reflect`, `decision`
- card curation supports accept/reject/edit

3. Review:
- `/review` shows due cards across all task types
- review completion writes `review_logs` and `learning_events`

4. Progress:
- new `/progress` dashboard
- shows 30d counters and 90d LMS trend
- data source is real events (`learning_events`)

5. Source details:
- capture history visible on `/sources/[id]`
- applied insight logging (`applied_insights`)

## Required DB migration

Run in order:

1. `supabase/migrations/20260228103000_mvp_01_schema.sql`
2. `supabase/migrations/20260301102000_mvp_02_capture_metrics.sql`

## Known limitations

- LLM integration is still placeholder/rule-based in server logic.
- `learning_daily_metrics` table exists but aggregation job is not yet implemented.
