# MVP 0.2: Agentic Capture + LLM Review Tasks

## Tavoite

Siirtää tuotteen UX lomakepohjaisesta syötöstä yhteen keskusteluikkunaan, jossa AI-agentti auttaa lähteen jalostamisen koko ketjun:

- input (teksti / kuva / ääni)
- tiivistys
- kortti- ja tehtäväehdotukset
- käyttäjän kuratointi
- daily review

Design-periaate säilyy:
**ihminen kuratoi, järjestelmä ehdottaa**.

## Kohderyhmä (v1)

- Founderit ja johtajat, jotka kuluttavat paljon sisältöä ja haluavat nostaa päätöksenteon laatua.
- Heille arvo tulee siitä, että opit muuttuvat käytännön toiminnaksi, eivät vain muistiinpanoiksi.

## Ongelma

Nykyinen flow vaatii liikaa manuaalista täyttöä:

- erilliset kentät hidastavat talteenottoa
- käyttö katkeaa mobiilissa
- tehtäväehdotukset tuntuvat geneerisiltä

## Ratkaisu

## 1. Yksi Capture-keskustelu

Uusi näkymä `/capture`:

- yksi chat-ikkuna
- käyttäjä voi:
  - kirjoittaa
  - ladata kuvan (OCR)
  - äänittää puheen (transkriptio)
- agentti ehdottaa:
  - lähteen otsikko + tyyppi
  - tiivistelmä (editable)
  - ydinkohdat

Ei erillisiä Source/Summary-kenttiä ensisyötössä.

## 2. LLM-tehtävägeneraattori

Summaryn pohjalta agentti luo:

- recall (muistaminen)
- apply (soveltaminen omaan tilanteeseen)
- reflect (ajattelun tarkennus)
- decision prompt (johtamispäätös / trade-off)

Käyttäjä voi:

- accept
- edit
- reject
- accept all

## 3. Daily review (päivitetty)

Review syöttää sekaisin:

- muistipalautus
- soveltamiskysymys
- yksi “today in context” -tehtävä (päivän päätöksiin linkitetty)

## Käyttäjäflow (v0.2)

1. User avaa `/capture`
2. Lisää inputin (teksti/kuva/ääni)
3. Agentti jalostaa summary-ehdotuksen keskustelussa
4. User hyväksyy summaryn -> tallennus
5. Agentti luo tehtäväehdotukset
6. User kuratoi tehtävät
7. `/review` näyttää due-tehtävät

## Tietomallimuutokset

Nykyisen päälle:

- `sources`
  - `capture_mode` text: `chat`
- `summaries`
  - `raw_input` text (optional)
  - `input_modality` text enum: `text | image | audio | mixed`
- `cards`
  - `generation_model` text (optional)
  - `generation_context` jsonb (optional)
- uusi `capture_messages`
  - `id`
  - `user_id`
  - `source_id`
  - `role` (`user | assistant | system`)
  - `content`
  - `created_at`

## API-sopimukset (v0.2)

1. `POST /api/capture/ingest`
- input: text/image/audio metadata
- output: normalized text + source draft

2. `POST /api/ai/summarize-capture`
- input: capture conversation/context
- output: summary draft + key points

3. `POST /api/ai/generate-review-tasks`
- input: sourceId + summaryId + optional user context
- output: tasks/cards array (`recall/apply/reflect/decision`)

## UI-muutokset

- Uusi sivu: `/capture`
- `/sources/new` voi ohjata `/capture`-näkymään
- `/sources/[id]` näyttää keskusteluhistorian + summary + cards
- `/review` lisää tehtävätyypin “decision prompt”

## Definition of Done (MVP 0.2)

- käyttäjä voi tuoda sisällön chat-ikkunan kautta
- agentti tuottaa summary-ehdotuksen keskustelussa
- käyttäjä hyväksyy/editoi summaryn
- järjestelmä generoi LLM-pohjaiset tehtävät
- käyttäjä kuratoi tehtävät
- review näyttää due-tehtävät useasta tehtävätyypistä

## Ei vielä MVP 0.2:ssa

- monimutkainen knowledge graph
- automaattinen ulkoinen suosittelumoottori
- täysi monimalli-orkestrointi
- enterprise-tenant-ominaisuudet

## Toteutusvaiheet

1. Capture chat UI + `capture_messages` tallennus
2. Image/audio -> text pipeline
3. Summary-agent route + hyväksyntäflow
4. Task-generation route + kuratointi
5. Review UI päivitys (uusi task-tyyppi)
