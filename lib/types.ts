export type SourceType =
  | "book"
  | "podcast"
  | "conversation"
  | "thought"
  | "article"
  | "video"
  | "other";

export type CardType = "recall" | "apply" | "reflect" | "discuss" | "decision" | "custom";
export type QuickTaskCardType = "recall" | "apply" | "reflect" | "discuss";
export type CardStatus = "suggested" | "active" | "rejected";
export type InputModality = "text" | "image" | "audio" | "mixed";
export type CaptureRole = "user" | "assistant" | "system";
export type CaptureMode = "text" | "image" | "voice" | "url";
export type CaptureAssetKind = "image" | "audio";
export type IdeaStatus = "draft" | "refined_without_cards" | "refined_with_cards";

type QuickTaskGuidance = {
  label: string;
  buttonLabel?: string;
  tooltip: string;
  summary: string;
  cardSupportText: string;
};

export const QUICK_TASK_TYPES: QuickTaskCardType[] = ["recall", "apply", "reflect", "discuss"];

export const QUICK_TASK_GUIDANCE: Record<QuickTaskCardType, QuickTaskGuidance> = {
  recall: {
    label: "Kertaustehtävä",
    tooltip: "Ohjaa muistamista ja palauttaa ydinajatuksen mieleen ilman, että vain luet sen uudestaan.",
    summary: "Ohjaa muistamista ja vahvistaa muistijälkeä.",
    cardSupportText: "auttaa muistamaan ydinasian"
  },
  apply: {
    label: "Soveltamistehtävä",
    tooltip: "Ohjaa käyttöön ja auttaa löytämään tilanteen, jossa voit soveltaa ideaa käytännössä.",
    summary: "Ohjaa käyttöön ja siirtää idean teoriasta käytäntöön.",
    cardSupportText: "auttaa viemään idean käytäntöön"
  },
  reflect: {
    label: "Reflektiotehtävä",
    tooltip: "Ohjaa syvempään ymmärrykseen ja auttaa pohtimaan, mitä ajatus merkitsee sinulle.",
    summary: "Ohjaa syvempään ymmärrykseen ja auttaa rakentamaan merkitystä.",
    cardSupportText: "auttaa syventämään omaa ymmärrystä"
  },
  discuss: {
    label: "Keskustelutehtävä",
    tooltip: "Ohjaa sosiaaliseen oppimiseen ja kannustaa syventämään ymmärrystä keskustelun kautta.",
    summary: "Ohjaa sosiaaliseen oppimiseen ja tuo uusia näkökulmia.",
    cardSupportText: "auttaa saamaan uusia näkökulmia"
  }
};

export interface TagSuggestion {
  tag: string;
  usageCount: number;
  lastUsedAt: string;
  isPopular: boolean;
}

export interface Source {
  id: string;
  type: SourceType;
  title: string;
  author?: string;
  origin?: string;
  publishedAt?: string;
  url?: string;
  tags?: string[];
}

export interface Summary {
  id: string;
  sourceId: string;
  content: string;
  source: "manual" | "chatgpt";
  updatedAt: string;
}

export interface Card {
  id: string;
  sourceId: string;
  summaryId?: string;
  status: CardStatus;
  cardType: CardType;
  prompt: string;
  answer: string;
  dueAt?: string;
}

export interface CaptureAsset {
  id: string;
  sourceId: string;
  kind: CaptureAssetKind;
  fileName: string;
  mimeType: string;
  fileSize: number;
  base64Data: string;
  createdAt: string;
}

export function cardTypeLabel(cardType: CardType): string {
  if (cardType === "recall") return "Kertaustehtävä";
  if (cardType === "apply") return "Soveltamistehtävä";
  if (cardType === "reflect") return "Reflektiotehtävä";
  if (cardType === "discuss") return "Keskustelutehtävä";
  if (cardType === "custom") return "Oma tehtävä";
  return "Päätöstehtävä";
}

export function cardTypeSupportText(cardType: CardType): string | null {
  if (cardType === "recall" || cardType === "apply" || cardType === "reflect" || cardType === "discuss") {
    return QUICK_TASK_GUIDANCE[cardType].cardSupportText;
  }

  return null;
}
