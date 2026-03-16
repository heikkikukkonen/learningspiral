# Project Guidance

- Production is wired directly to GitHub `main`. Treat pushes to `origin/main` as automatically triggering a production deployment unless the user says the pipeline has changed.
- Supabase migrations are applied automatically during deploys. Do not assume production database schema changes require a separate manual migration step unless the user says the deployment pipeline has changed.
