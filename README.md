# Noema 0.3.0

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
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SITE_URL` (optional, recommended for auth redirects in production)
- `NEXT_PUBLIC_ENABLED_OAUTH_PROVIDERS` (optional, comma-separated list such as `google` or `google,apple`)
- `OPENAI_API_KEY` (for live LLM responses and card generation)
- `OPENAI_MODEL` (optional, defaults to `gpt-4.1-mini`)

3. Run SQL migrations in order in Supabase SQL editor:

- `supabase/migrations/20260228103000_mvp_01_schema.sql`
- `supabase/migrations/20260301102000_mvp_02_capture_metrics.sql`
- `supabase/migrations/20260315100000_add_idea_status_to_sources.sql`
- `supabase/migrations/20260318103000_add_user_profiles_auth.sql`

4. Start dev server:

```bash
npm run dev
```

## OAuth Setup

If you want Google or Apple login, configure both sides:

1. In Supabase Dashboard, open `Authentication -> Providers` and enable the providers you want.
2. In Google Cloud and Apple Developer, use your Supabase callback URL:
   - production: `https://<project-ref>.supabase.co/auth/v1/callback`
   - local Supabase CLI: `http://127.0.0.1:54321/auth/v1/callback`
3. In Supabase `Authentication -> URL Configuration`, allow your app callback URL:
   - local: `http://localhost:3000/auth/callback`
   - production: `https://your-domain/auth/callback`
4. Set `NEXT_PUBLIC_ENABLED_OAUTH_PROVIDERS=google,apple` in `.env.local` so the login page only shows providers that are actually enabled for this deployment.

## Database Changes in 0.3.0

New tables:

- `capture_messages`
- `learning_events`
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
- Login/Auth flow uses Supabase Auth with email confirmation and OAuth providers.

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
