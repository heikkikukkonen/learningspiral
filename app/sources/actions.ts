"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { analysisModeLabel, isAnalysisMode } from "@/lib/analysis-actions";
import {
  completeReview,
  deleteCard,
  deleteSource,
  createSource,
  generateSuggestedCard,
  getUserSettings,
  listUserTagStats,
  updateSource,
  updateCard,
  upsertSummary
} from "@/lib/db";
import { CardType, InputModality, SourceType } from "@/lib/types";
import { buildSourceSummaryContent, dedupeTags } from "@/lib/source-editor";
import { generateSourceTags, refineSourceDraft } from "@/lib/llm";

function asString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

function readTags(value: string): string[] {
  return dedupeTags(
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  );
}

function readCardDrafts(formData: FormData) {
  const drafts = new Map<
    string,
    { cardId: string; prompt?: string; answer?: string; cardType?: CardType }
  >();

  for (const [key, value] of formData.entries()) {
    const match = key.match(/^cards\[(\d+)\]\.(cardId|prompt|answer|cardType)$/);
    if (!match || typeof value !== "string") continue;

    const [, index, field] = match;
    const current = drafts.get(index) ?? { cardId: "" };

    if (field === "cardId") current.cardId = value;
    if (field === "prompt") current.prompt = value;
    if (field === "answer") current.answer = value;
    if (field === "cardType") current.cardType = value as CardType;

    drafts.set(index, current);
  }

  return [...drafts.entries()]
    .sort((left, right) => Number(left[0]) - Number(right[0]))
    .map(([, draft]) => draft)
    .filter(
      (draft): draft is { cardId: string; prompt: string; answer: string; cardType: CardType } =>
        Boolean(draft.cardId && draft.prompt && draft.answer && draft.cardType)
    );
}

export async function createSourceAction(formData: FormData) {
  const tags = readTags(asString(formData.get("tags")));

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
  const scheduleValue = asString(formData.get("schedule"));
  const schedule =
    scheduleValue === "soon" || scheduleValue === "near" || scheduleValue === "later"
      ? scheduleValue
      : "near";
  const userAnswer = asString(formData.get("userAnswer"));
  await completeReview(cardId, schedule, userAnswer);
  revalidatePath("/review");
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
  const tags = readTags(asString(formData.get("tags")));
  const cardDrafts = readCardDrafts(formData);

  await updateSource({
    sourceId,
    title,
    tags
  });

  await upsertSummary(sourceId, buildSourceSummaryContent({ idea, analysis }), {
    rawInput,
    inputModality: inputModality || "text"
  });

  await Promise.all(
    cardDrafts.map((card) =>
      updateCard({
        cardId: card.cardId,
        sourceId,
        prompt: card.prompt,
        answer: card.answer,
        cardType: card.cardType
      })
    )
  );

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
  const customInstruction = asString(formData.get("customInstruction")).trim();
  const tags = readTags(asString(formData.get("tags")));

  const mode = modeValue === "custom" ? "custom" : isAnalysisMode(modeValue) ? modeValue : "clarify";
  const settings = await getUserSettings();

  const refined = await refineSourceDraft({
    mode,
    title,
    idea,
    analysis,
    rawInput,
    tags,
    customInstruction,
    settings
  });

  return {
    title: refined.data.title,
    idea: refined.data.idea,
    analysis: refined.data.analysis,
    tags: refined.data.tags,
    mode,
    modeLabel: analysisModeLabel(mode),
    model: refined.model ?? null
  };
}

export async function generateSourceTagsAction(formData: FormData) {
  const title = asString(formData.get("title")).trim();
  const idea = asString(formData.get("idea")).trim();
  const [settings, existingTags] = await Promise.all([getUserSettings(), listUserTagStats()]);

  const generated = await generateSourceTags({
    title,
    idea,
    existingTags,
    settings
  });

  return {
    tags: generated.data,
    model: generated.model ?? null,
    debugPrompt: generated.debugPrompt ?? null
  };
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

export async function generateCardAction(formData: FormData) {
  const sourceId = asString(formData.get("sourceId"));
  const variantValue = asString(formData.get("variant"));
  const instruction = asString(formData.get("instruction")).trim();
  const cardType =
    variantValue === "recall" ||
    variantValue === "apply" ||
    variantValue === "reflect" ||
    variantValue === "discuss" ||
    variantValue === "custom"
      ? variantValue
      : undefined;

  if (variantValue === "custom" && !instruction) {
    throw new Error("Kirjoita ohje tehtävän luontia varten.");
  }

  await generateSuggestedCard({
    sourceId,
    cardType,
    instruction: instruction || undefined
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

export async function deleteSourceAction(formData: FormData) {
  const sourceId = asString(formData.get("sourceId"));
  await deleteSource(sourceId);
  revalidatePath("/sources");
  revalidatePath("/review");
  revalidatePath("/progress");
  redirect("/sources");
}
