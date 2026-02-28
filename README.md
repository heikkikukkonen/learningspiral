# LearningSpiral MVP 0.1 UI

Ensimmäinen käyttöliittymäversio MVP-flowlle:

- `/login`
- `/sources`
- `/sources/new`
- `/sources/[id]`
- `/review`

Nykyinen toteutus käyttää mock-dataa (`lib/mock-data.ts`) ja simuloi toiminnallisuuksia ilman Supabase/AI-backendiä.

## Käynnistys

```bash
npm install
npm run dev
```

## Seuraavat integraatiot

- Supabase Auth + RLS
- `sources`, `summaries`, `cards` taulut
- `POST /api/ai/generate-cards`
- Review scheduling backend-päivitykset
