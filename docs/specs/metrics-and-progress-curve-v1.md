# Metrics and Progress Curve v1

## Tavoite

Näyttää käyttäjälle näkyvästi, että oppiminen kumuloituu.
Käyrän pitää palkita käyttäjää päivittäin, vaikka pitkän aikavälin eksponentti näkyy vasta myöhemmin.

## Tuotelupaus mittareina

Käyttäjä kokee:

- “en vain kuluta sisältöä, vaan sisäistän sitä”
- “päätöksentekoni paranee”
- “en halua luopua tästä rutiinista”

## North Star (v1)

`Learning Momentum Score (LMS)` per user per päivä.

LMS muodostuu kolmesta osasta:

- Retrieval: kuinka paljon due-tehtäviä suoritettiin
- Integration: kuinka paljon uusia hyväksyttyjä kortteja lisättiin
- Application: kuinka monta sovellushavaintoa kirjattiin

Esimerkkikaava (v1, yksinkertainen):

`LMS = 0.5 * normalized_reviews + 0.3 * normalized_accepts + 0.2 * normalized_applied_insights`

## Päämittarit dashboardille

1. Active Review Days (30d)
- montako päivää viimeisen 30 päivän aikana käyttäjä teki vähintään 1 review-vastauksen

2. Cards Accepted (30d)
- hyväksyttyjen korttien määrä

3. Applied Insights (30d)
- käyttäjän kirjaamat “missä sovelsin tätä” -merkinnät

4. LMS Trend (90d)
- päivittäinen pistekäyrä

## Edistymiskäyräkomponentit (UI)

Dashboard `/progress` (tai etusivu):

- pääkäyrä: LMS trend 90 päivää
- mini-käyrät:
  - review consistency
  - cards accepted
  - applied insights
- “today delta”:
  - tämän päivän vaikutus pisteeseen

## Eventit (telemetria)

Tarvittavat eventit:

- `capture_submitted`
- `summary_saved`
- `cards_generated`
- `card_accepted`
- `card_rejected`
- `review_completed`
- `insight_logged`

Event schema:

- `id`
- `user_id`
- `event_type`
- `entity_id` (optional)
- `payload` jsonb
- `created_at`

## Tietomalli lisäys

uusi taulu `learning_events`:

- `id uuid pk`
- `user_id uuid`
- `event_type text`
- `entity_id uuid null`
- `payload jsonb not null default '{}'::jsonb`
- `created_at timestamptz default now()`

uusi taulu `applied_insights`:

- `id uuid pk`
- `user_id uuid`
- `card_id uuid null`
- `source_id uuid null`
- `note text not null`
- `created_at timestamptz default now()`

## Laskenta (v1)

Ajotapa:

- yöajona materialisoitu daily aggregate per user
- tai request-time laskenta pienelle käyttäjämäärälle

suositus v1:

- daily aggregate taulu `learning_daily_metrics`
- kentät:
  - `user_id`
  - `date`
  - `reviews_count`
  - `accepted_count`
  - `applied_count`
  - `lms_score`

## Definition of Done (v1)

- dashboard näyttää vähintään 90 päivän käyrän
- LMS päivittyy päivittäin
- käyttäjä näkee päivän vaikutuksen kokonaiskäyrään
- datan lähde on oikeat eventit, ei mock

## Riskit

- mittari voi ohjata väärään käyttäytymiseen (gaming)
- liian monimutkainen kaava heikentää luottamusta
- liian hidas päivitys heikentää motivaatiota

## Guardrails

- kaava pidetään läpinäkyvänä
- vältetään “vanity metrics”
- painotetaan laatua:
  - apply/insight eventit tärkeämpiä kuin pelkkä sisällön syöttö
