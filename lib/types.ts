export type SourceType =
  | "book"
  | "podcast"
  | "conversation"
  | "thought"
  | "article"
  | "video"
  | "other";

export type CardType = "recall" | "apply" | "reflect" | "decision";
export type CardStatus = "suggested" | "active" | "rejected";
export type InputModality = "text" | "image" | "audio" | "mixed";
export type CaptureRole = "user" | "assistant" | "system";

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
