# MVP 0.1: Source summary → cards → daily review

## Tavoite

Web-sovellus, jossa käyttäjä voi:

1. lisätä **lähteen** (kirja/podcast/keskustelu/oma ajatus)
2. liittää lähteelle **tiivistelmän** (kirjoitettu itse tai tehty ChatGPT:llä)
3. generoida tiivistelmästä kertauskortit (LLM)
4. hyväksyä/editoida/hylätä kortit
5. tehdä päivittäisen kertauksen (spaced repetition)

Design-periaate: **ihminen kuratoi, järjestelmä ehdottaa**.

---

## Keskeiset käsitteet

- **Source (lähde):** mikä tahansa oppimisen alkuperä (book/podcast/conversation/thought/other).
- **Summary:** käyttäjän tiivistelmä lähteen ydinasioista.
- **Card:** kertauskortti (recall/apply/reflect) spaced repetition -aikataululla.

(MVP 0.1: ei vielä tarvitse “poimintoja” tai linkityksiä, ne voidaan lisätä 0.2:ssa.)

---

## Teknologiaoletus

- Next.js (App Router) + TypeScript
- Supabase (Auth + Postgres)
- shadcn/ui
- AI: yksi API route `POST /api/ai/generate-cards` (aluksi stub mahdollinen)

---

## Sivut (App Router)

1. `/login`
2. `/sources` – listaa lähteet, “Add source”
3. `/sources/new` – luo lähde
4. `/sources/[id]` – lähdenäkymä:
   - metadata
   - summary editor + save
   - “Generate cards from summary”
   - listaa suggested-kortit + accept/edit/reject
5. `/review` – daily review

---

## Tietomalli (Supabase / Postgres)

### sources

- id (uuid)
- user_id (uuid)
- type (text enum): `book | podcast | conversation | thought | article | video | other`
- title (text, required)
- author (text, optional)        // kirja/podcast
- origin (text, optional)        // esim. “Podcast: The Knowledge Project”, “Keskustelu: Tiimipalaveri”
- published_at (date, optional)  // jos relevantti
- url (text, optional)
- tags (text[] optional)
- created_at

### summaries

- id (uuid)
- user_id
- source_id (fk → sources)
- content (text, required)       // käyttäjän tiivistelmä
- source (text): `manual | chatgpt`
- created_at
- updated_at

(MVP: yksi “current summary” per source riittää; voit myös versionoida myöhemmin.)

### cards

- id (uuid)
- user_id
- source_id (fk → sources)
- summary_id (fk → summaries, nullable)
- status (text): `suggested | active | rejected`
- card_type (text): `recall | apply | reflect`
- prompt (text)
- answer (text)

Scheduling:

- due_at (timestamptz)
- interval_days (int)
- ease (float, default 2.5)
- reps (int)
- lapses (int)
- last_reviewed_at (timestamptz)

### review_logs (valinnainen)

- id, user_id, card_id
- rating (int 1–4)
- reviewed_at

RLS: kaikki taulut user_id:llä, policy `auth.uid() = user_id`.

---

## Toiminnalliset flowt

### 1) Add source

- käyttäjä luo lähteen: type + title (pakolliset), muut optional
- redirect `/sources/[id]`

### 2) Add/edit summary

- lähdesivulla iso tekstieditori
- “Save summary” kirjoittaa `summaries` (upsert current)

### 3) Generate cards from summary (AI)

- nappi “Generate cards”
- `POST /api/ai/generate-cards` input: sourceId + summaryId
- backend lukee summary contentin ja pyytää LLM:ltä:
  - 10 korttia (ohjeellinen jakauma: 4 recall, 3 apply, 3 reflect)
  - prompt aina kysymysmuodossa
  - answer tiivis (2–4 lausetta)
- backend tallentaa `cards` status=`suggested`

### 4) Curate cards

- suggested-kortit listana:
  - inline edit prompt/answer/type
  - Accept → status active + init schedule (due now)
  - Reject → status rejected
  - (valinnainen) Accept all

### 5) Daily review

- `/review`: hae active-kortit, due_at <= now
- UI: prompt → “show answer” → rating 1–4
- Päivitä schedule SM-2-tyylisesti (yksinkertaistettu kaava)

---

## API-sopimus

`POST /api/ai/generate-cards`

Request:

```json
{ "sourceId": "uuid", "summaryId": "uuid" }
```

Response:

```json
{
  "cards": [
    { "card_type": "recall", "prompt": "...", "answer": "..." }
  ]
}
```

LLM promptissa pitää mainita lähteen tyyppi ja otsikko (antaa kontekstia), mutta summary on “source of truth”.

---

## Definition of Done MVP 0.1

- käyttäjä luo lähteen (mikä tahansa type)
- tallentaa summaryn
- generoi korttiehdotukset summaryn perusteella
- hyväksyy kortteja active-tilaan
- tekee kertauksen ja due-aikataulu päivittyy
