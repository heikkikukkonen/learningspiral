import { Card, Source, Summary } from "@/lib/types";

export const demoSources: Source[] = [
  {
    id: "src-1",
    type: "book",
    title: "Thinking in Systems",
    author: "Donella Meadows",
    tags: ["systems", "decision-making"]
  },
  {
    id: "src-2",
    type: "podcast",
    title: "The Knowledge Project #190",
    origin: "Podcast",
    tags: ["mental models"]
  }
];

export const demoSummaryBySourceId: Record<string, Summary> = {
  "src-1": {
    id: "sum-1",
    sourceId: "src-1",
    source: "manual",
    updatedAt: "2026-02-28T09:00:00Z",
    content:
      "Systeemit tuottavat usein käyttäytymistä, jota emme odota. Vivut löytyvät tavoitteista, palautesilmukoista ja viiveiden ymmärtämisestä."
  },
  "src-2": {
    id: "sum-2",
    sourceId: "src-2",
    source: "chatgpt",
    updatedAt: "2026-02-28T08:30:00Z",
    content:
      "Päätöksenteossa tärkeää on erottaa reversiibelit ja irreversiibelit päätökset. Ensin rakenna päätöksen konteksti, vasta sitten optimoi."
  }
};

export const demoSuggestedCards: Card[] = [
  {
    id: "c-1",
    sourceId: "src-1",
    summaryId: "sum-1",
    status: "suggested",
    cardType: "recall",
    prompt: "Mikä on järjestelmän tärkein käyttäytymistä ohjaava osa?",
    answer:
      "Järjestelmän tavoitteet ohjaavat sen pitkän aikavälin käyttäytymistä usein enemmän kuin yksittäiset parametrit."
  },
  {
    id: "c-2",
    sourceId: "src-1",
    summaryId: "sum-1",
    status: "suggested",
    cardType: "apply",
    prompt: "Miten tunnistat viiveen vaikutuksen omassa projektissa?",
    answer:
      "Listaa syötteet ja odotettu vaikutus, sitten mittaa milloin vaikutus oikeasti näkyy. Erotus on viive, jota pitää huomioida päätöksissä."
  },
  {
    id: "c-3",
    sourceId: "src-1",
    summaryId: "sum-1",
    status: "suggested",
    cardType: "reflect",
    prompt: "Missä tilanteessa olet optimoinut väärää mittaria?",
    answer:
      "Arvioi tilanne, jossa nopeus parani mutta laatu heikkeni. Mitä tavoitetta olisi pitänyt seurata?"
  }
];

export const demoDueCards: Card[] = [
  {
    id: "r-1",
    sourceId: "src-1",
    status: "active",
    cardType: "recall",
    prompt: "Miksi järjestelmän tavoite on vahvempi vipu kuin parametri?",
    answer:
      "Tavoite määrittää mihin suuntaan järjestelmä korjaa itseään. Parametri vaikuttaa yleensä vain säätötasolla.",
    dueAt: "2026-02-28T07:00:00Z"
  },
  {
    id: "r-2",
    sourceId: "src-2",
    status: "active",
    cardType: "apply",
    prompt: "Milloin päätös kannattaa tehdä kaksivaiheisena?",
    answer:
      "Kun epävarmuus on korkea ja päätöksen voi osin perua, tee ensin pieni kokeilu ja vasta sitten sitova päätös.",
    dueAt: "2026-02-28T07:05:00Z"
  }
];
