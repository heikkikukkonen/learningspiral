"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  acceptAllSuggested,
  completeReview,
  createAppliedInsight,
  deleteCard,
  createSource,
  generateSuggestedCards,
  updateSource,
  updateCard,
  upsertSummary
} from "@/lib/db";
import { CardType, InputModality, SourceType } from "@/lib/types";
import { buildSourceSummaryContent, suggestSourceTags } from "@/lib/source-editor";
import { refineSourceDraft } from "@/lib/llm";

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

export async function completeReviewAction(formData: FormData) {
  const cardId = asString(formData.get("cardId"));
  const rating = Number(asString(formData.get("rating")) || "3");
  const userAnswer = asString(formData.get("userAnswer"));
  await completeReview(cardId, rating, userAnswer);
  revalidatePath("/review");
  revalidatePath("/progress");
}

export async function logInsightAction(formData: FormData) {
  const sourceId = asString(formData.get("sourceId")) || null;
  const cardId = asString(formData.get("cardId")) || null;
  const note = asString(formData.get("note"));

  await createAppliedInsight({ note, sourceId, cardId });

  if (sourceId) revalidatePath(`/sources/${sourceId}`);
  revalidatePath("/progress");
}

export async function saveSummaryAction(formData: FormData) {
  const sourceId = asString(formData.get("sourceId"));
  const content = asString(formData.get("content"));
  const rawInput = asString(formData.get("rawInput")) || null;
  const inputModality = asString(formData.get("inputModality")) as InputModality;

  await upsertSummary(sourceId, content, {
    rawInput,
    inputModality: inputModality || "text"
  });

  revalidatePath(`/sources/${sourceId}`);
  revalidatePath("/progress");
}

export async function saveSourceDraftAction(formData: FormData) {
  const sourceId = asString(formData.get("sourceId"));
  const title = asString(formData.get("title")).trim() || "Untitled idea";
  const idea = asString(formData.get("idea"));
  const analysis = asString(formData.get("analysis"));
  const rawInput = asString(formData.get("rawInput")) || null;
  const inputModality = asString(formData.get("inputModality")) as InputModality;
  const generateCardsOnSave = asString(formData.get("generateCardsOnSave")) === "true";
  const tags = asString(formData.get("tags"))
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const resolvedTags =
    tags.length > 0
      ? tags
      : suggestSourceTags({
          title,
          idea,
          analysis,
          rawInput
        });

  await updateSource({
    sourceId,
    title,
    tags: resolvedTags
  });

  await upsertSummary(sourceId, buildSourceSummaryContent({ idea, analysis }), {
    rawInput,
    inputModality: inputModality || "text"
  });

  if (generateCardsOnSave) {
    await generateSuggestedCards({ sourceId });
  }

  revalidatePath(`/sources/${sourceId}`);
  revalidatePath(`/capture?sourceId=${sourceId}`);
  revalidatePath("/sources");
  revalidatePath("/progress");
}

export async function refineSourceDraftAction(formData: FormData) {
  const title = asString(formData.get("title")).trim() || "Untitled idea";
  const idea = asString(formData.get("idea"));
  const analysis = asString(formData.get("analysis"));
  const rawInput = asString(formData.get("rawInput"));
  const modeValue = asString(formData.get("mode"));
  const tags = asString(formData.get("tags"))
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const mode =
    modeValue === "deepen" || modeValue === "summarize" || modeValue === "refresh"
      ? modeValue
      : "refresh";

  const refined = await refineSourceDraft({
    mode,
    title,
    idea,
    analysis,
    rawInput,
    tags
  });

  return {
    title: refined.data.title,
    idea: refined.data.idea,
    analysis: refined.data.analysis,
    tags: refined.data.tags,
    mode,
    model: refined.model ?? null
  };
}

export async function generateCardsAction(formData: FormData) {
  const sourceId = asString(formData.get("sourceId"));
  await generateSuggestedCards({ sourceId });
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
  revalidatePath("/progress");
}

export async function deleteCardAction(formData: FormData) {
  const sourceId = asString(formData.get("sourceId"));
  await deleteCard({
    cardId: asString(formData.get("cardId")),
    sourceId
  });
  revalidatePath(`/sources/${sourceId}`);
  revalidatePath("/review");
  revalidatePath("/progress");
}

export async function acceptAllSuggestedAction(formData: FormData) {
  const sourceId = asString(formData.get("sourceId"));
  await acceptAllSuggested(sourceId);
  revalidatePath(`/sources/${sourceId}`);
  revalidatePath("/review");
  revalidatePath("/progress");
}
