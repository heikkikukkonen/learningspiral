"use server";

import { revalidatePath } from "next/cache";
import {
  deleteSource,
  getSourceWithDetails,
  updateSource,
  upsertThoughtNetworkLayout
} from "@/lib/db";
import { dedupeTags, normalizeTagValue } from "@/lib/source-editor";
import { resolveSourceIdeaStatus, sourceIdeaStageLabel } from "@/lib/source-status";
import type { ThoughtNetworkLayoutMap } from "@/lib/db";

function asString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value : "";
}

export async function addThoughtTagAction(formData: FormData) {
  const sourceId = asString(formData.get("sourceId")).trim();
  const rawTag = asString(formData.get("tag")).replace(/^#+/, "").trim();

  if (!sourceId) {
    throw new Error("Ajatusta ei löytynyt.");
  }

  if (!rawTag) {
    throw new Error("Kirjoita tunniste ennen lisäämistä.");
  }

  const { source, cards } = await getSourceWithDetails(sourceId);
  if (!source) {
    throw new Error("Ajatusta ei löytynyt.");
  }

  const currentTags = dedupeTags(source.tags ?? []);
  const normalizedTag = normalizeTagValue(rawTag);
  const matchingExistingTag =
    currentTags.find((tag) => normalizeTagValue(tag) === normalizedTag) ?? null;
  const nextTags = matchingExistingTag ? currentTags : dedupeTags([...currentTags, rawTag]);
  const nextIdeaStatus = resolveSourceIdeaStatus({
    ideaStatus: source.idea_status,
    hasCards: cards.length > 0,
    tags: nextTags
  });

  if (!matchingExistingTag) {
    await updateSource({
      sourceId,
      title: source.title,
      tags: nextTags,
      ideaStatus: nextIdeaStatus
    });
  }

  revalidatePath("/ajatusverkko");
  revalidatePath("/sources");
  revalidatePath(`/sources/${sourceId}`);
  revalidatePath("/review");
  revalidatePath("/progress");

  return {
    sourceId,
    tag: matchingExistingTag ?? rawTag,
    tags: nextTags,
    stageLabel: sourceIdeaStageLabel(nextIdeaStatus)
  };
}

export async function deleteThoughtFromNetworkAction(formData: FormData) {
  const sourceId = asString(formData.get("sourceId")).trim();

  if (!sourceId) {
    throw new Error("Ajatusta ei löytynyt.");
  }

  await deleteSource(sourceId);

  revalidatePath("/ajatusverkko");
  revalidatePath("/sources");
  revalidatePath("/review");
  revalidatePath("/progress");

  return { sourceId };
}

export async function saveThoughtNetworkLayoutAction(layout: ThoughtNetworkLayoutMap) {
  return upsertThoughtNetworkLayout(layout);
}
