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
};

export const QUICK_TASK_TYPES: QuickTaskCardType[] = ["recall", "apply", "reflect", "discuss"];

export const QUICK_TASK_GUIDANCE: Record<QuickTaskCardType, QuickTaskGuidance> = {
  recall: {
    label: "Kertaustehtava",
    tooltip: "Ohjaa muistamista ja palauttaa ydinajatuksen mieleen ilman, etta vain luet sen uudestaan.",
    summary: "Ohjaa muistamista ja vahvistaa muistijalkea."
  },
  apply: {
    label: "Soveltamistehtava",
    tooltip: "Ohjaa kayttoon ja auttaa loytamaan tilanteen, jossa voit soveltaa ideaa kaytannossa.",
    summary: "Ohjaa kayttoon ja siirtaa idean teoriasta kaytantoon."
  },
  reflect: {
    label: "Reflektiotehtava",
    tooltip: "Ohjaa syvempaan ymmarrykseen ja auttaa pohtimaan, mita ajatus merkitsee sinulle.",
    summary: "Ohjaa syvempaan ymmarrykseen ja auttaa rakentamaan merkitysta."
  },
  discuss: {
    label: "Keskustelutehtava",
    buttonLabel: "Keskustelutehtava ystavan kanssa",
    tooltip: "Ohjaa sosiaaliseen oppimiseen ja kannustaa syventamaan ymmarrysta keskustelun kautta.",
    summary: "Ohjaa sosiaaliseen oppimiseen ja tuo uusia nakokulmia."
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
  if (cardType === "recall") return "Kertaustehtava";
  if (cardType === "apply") return "Soveltamistehtava";
  if (cardType === "reflect") return "Reflektiotehtava";
  if (cardType === "discuss") return "Keskustelutehtava";
  if (cardType === "custom") return "Oma tehtava";
  return "Paatostehtava";
}
