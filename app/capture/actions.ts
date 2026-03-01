"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createSourceFromCapture,
  respondInCapture,
  upsertSummary,
  listCaptureMessages
} from "@/lib/db";
import { InputModality, SourceType } from "@/lib/types";

function asString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

function inferTitle(rawInput: string): string {
  const firstLine = rawInput
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);
  return (firstLine || "Untitled capture").slice(0, 90);
}

export async function startCaptureAction(formData: FormData) {
  const rawInput = asString(formData.get("rawInput"));
  const inputModality = asString(formData.get("inputModality")) as InputModality;
  const sourceType = asString(formData.get("sourceType")) as SourceType;
  const title = asString(formData.get("title")) || inferTitle(rawInput);

  const source = await createSourceFromCapture({
    title,
    type: sourceType || "other",
    rawInput,
    inputModality: inputModality || "text"
  });

  revalidatePath("/capture");
  revalidatePath("/sources");
  revalidatePath(`/sources/${source.id}`);
  revalidatePath("/progress");
  redirect(`/capture?sourceId=${source.id}`);
}

export async function sendCaptureMessageAction(formData: FormData) {
  const sourceId = asString(formData.get("sourceId"));
  const message = asString(formData.get("message"));

  await respondInCapture(sourceId, message);

  const allMessages = await listCaptureMessages(sourceId);
  const rawInput = allMessages
    .filter((item) => item.role === "user")
    .map((item) => item.content)
    .join("\n\n");
  const latestAssistant =
    allMessages
      .filter((item) => item.role === "assistant")
      .at(-1)
      ?.content ?? "";

  if (latestAssistant) {
    await upsertSummary(sourceId, latestAssistant, {
      rawInput,
      inputModality: "mixed",
      source: "chatgpt"
    });
  }

  revalidatePath(`/capture?sourceId=${sourceId}`);
  revalidatePath(`/sources/${sourceId}`);
}
