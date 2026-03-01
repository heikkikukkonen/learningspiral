"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  acceptAllSuggested,
  createSource,
  generateSuggestedCards,
  updateCard,
  upsertSummary
} from "@/lib/db";
import { CardType, SourceType } from "@/lib/types";

function asString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

export async function createSourceAction(formData: FormData) {
  const tags = asString(formData.get("tags"))
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const source = await createSource({
    type: asString(formData.get("type")) as SourceType,
    title: asString(formData.get("title")),
    author: asString(formData.get("author")),
    origin: asString(formData.get("origin")),
    publishedAt: asString(formData.get("publishedAt")),
    url: asString(formData.get("url")),
    tags
  });

  revalidatePath("/sources");
  redirect(`/sources/${source.id}`);
}

export async function saveSummaryAction(formData: FormData) {
  const sourceId = asString(formData.get("sourceId"));
  const content = asString(formData.get("content"));
  await upsertSummary(sourceId, content);
  revalidatePath(`/sources/${sourceId}`);
}

export async function generateCardsAction(formData: FormData) {
  const sourceId = asString(formData.get("sourceId"));
  const summaryId = asString(formData.get("summaryId")) || null;
  const summaryContent = asString(formData.get("summaryContent"));
  await generateSuggestedCards({ sourceId, summaryId, summaryContent });
  revalidatePath(`/sources/${sourceId}`);
}

export async function saveCardAction(formData: FormData) {
  const sourceId = asString(formData.get("sourceId"));
  await updateCard({
    cardId: asString(formData.get("cardId")),
    sourceId,
    prompt: asString(formData.get("prompt")),
    answer: asString(formData.get("answer")),
    cardType: asString(formData.get("cardType")) as CardType
  });
  revalidatePath(`/sources/${sourceId}`);
}

export async function setCardStatusAction(formData: FormData) {
  const sourceId = asString(formData.get("sourceId"));
  await updateCard({
    cardId: asString(formData.get("cardId")),
    sourceId,
    prompt: asString(formData.get("prompt")),
    answer: asString(formData.get("answer")),
    cardType: asString(formData.get("cardType")) as CardType,
    status: asString(formData.get("status")) as "active" | "rejected"
  });
  revalidatePath(`/sources/${sourceId}`);
  revalidatePath("/review");
}

export async function acceptAllSuggestedAction(formData: FormData) {
  const sourceId = asString(formData.get("sourceId"));
  await acceptAllSuggested(sourceId);
  revalidatePath(`/sources/${sourceId}`);
  revalidatePath("/review");
}
