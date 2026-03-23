export type SourceType =
  | "book"
  | "podcast"
  | "conversation"
  | "thought"
  | "article"
  | "video"
  | "other";

export type CardType = "recall" | "apply" | "reflect" | "decision" | "custom";
export type CardStatus = "suggested" | "active" | "rejected";
export type InputModality = "text" | "image" | "audio" | "mixed";
export type CaptureRole = "user" | "assistant" | "system";
export type CaptureMode = "text" | "image" | "voice" | "url";
export type CaptureAssetKind = "image" | "audio";
export type IdeaStatus = "draft" | "refined_without_cards" | "refined_with_cards";

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
  if (cardType === "custom") return "Oma tehtava";
  return "Paatostehtava";
}
