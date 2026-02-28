# LearningSpiral MVP 0.1

Project now has a working Supabase database layer for:

- sources
- summaries
- cards
- review_logs

UI routes:

- `/login`
- `/sources`
- `/sources/new`
- `/sources/[id]`
- `/review`

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local` from `.env.example` and fill:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `APP_USER_ID` (any fixed UUID for now)

3. Run SQL migration in Supabase SQL editor:

- `supabase/migrations/20260228103000_mvp_01_schema.sql`

4. Start dev server:

```bash
npm run dev
```

## Notes

- Current implementation writes with service role on server side.
- RLS policies are included in schema for `auth.uid() = user_id`.
- Login/Auth flow is not connected yet.

## CI migration pipeline

GitHub Actions workflow file:

- `.github/workflows/supabase-migrations.yml`

It runs on:

- push to `main` when files under `supabase/migrations/**` change
- manual trigger (`workflow_dispatch`)

Add these GitHub repository secrets:

- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_REF`
- `SUPABASE_DB_PASSWORD`
