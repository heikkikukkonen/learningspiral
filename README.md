# LearningSpiral MVP 0.2 (Interim Release)

This release includes:

- capture chat flow (`/capture`)
- source details with capture history, summary editing and card curation (`/sources/[id]`)
- daily review with multiple task types (including `decision`) (`/review`)
- progress dashboard with LMS trend and 30-day metrics (`/progress`)

## Current Routes

- `/`
- `/capture`
- `/sources`
- `/sources/new` (redirects to `/capture`)
- `/sources/[id]`
- `/review`
- `/progress`
- `/login`

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local` from `.env.example` and fill:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `APP_USER_ID` (fixed UUID for local development)
- `OPENAI_API_KEY` (for live LLM responses and card generation)
- `OPENAI_MODEL` (optional, defaults to `gpt-4.1-mini`)

3. Run SQL migrations in order in Supabase SQL editor:

- `supabase/migrations/20260228103000_mvp_01_schema.sql`
- `supabase/migrations/20260301102000_mvp_02_capture_metrics.sql`

4. Start dev server:

```bash
npm run dev
```

## Database Changes in MVP 0.2

New tables:

- `capture_messages`
- `learning_events`
- `applied_insights`
- `learning_daily_metrics`

Changed tables:

- `sources.capture_mode`
- `summaries.raw_input`
- `summaries.input_modality`
- `cards.generation_model`
- `cards.generation_context`
- `card_type` enum now includes `decision`

## Notes

- If `OPENAI_API_KEY` is missing, capture replies and card generation fall back to rule-based placeholder logic.
- Telemetry events are written to `learning_events` and feed progress metrics.
- Login/Auth flow is still not connected to real user auth in UI.

## CI Migration Pipeline

GitHub Actions workflow file:

- `.github/workflows/supabase-migrations.yml`

It runs on:

- push to `main` when files under `supabase/migrations/**` change
- manual trigger (`workflow_dispatch`)

Required repository secrets:

- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_REF`
- `SUPABASE_DB_PASSWORD`
