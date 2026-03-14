"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createSourceFromMultimodalCapture,
  deleteSource,
  listCaptureMessages,
  respondInCapture,
  upsertSummary
} from "@/lib/db";
import { CaptureMode, InputModality, SourceType } from "@/lib/types";

function asString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

function asFile(value: FormDataEntryValue | null): File | null {
  return value instanceof File && value.size > 0 ? value : null;
}

function inferTitle(rawInput: string): string {
  const firstLine = rawInput
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);
  return (firstLine || "Untitled capture").slice(0, 90);
}

function inputModalityFromMode(mode: CaptureMode, hasText: boolean): InputModality {
  if (mode === "image") return hasText ? "mixed" : "image";
  if (mode === "voice") return hasText ? "mixed" : "audio";
  if (mode === "url") return "mixed";
  return "text";
}

export async function startCaptureAction(formData: FormData) {
  const mode = (asString(formData.get("captureMode")) || "text") as CaptureMode;
  const rawInput = asString(formData.get("rawInput"));
  const sourceType = asString(formData.get("sourceType")) as SourceType;
  const origin = asString(formData.get("origin"));
  const url = asString(formData.get("url"));
  const imageFile = asFile(formData.get("imageFile"));
  const audioFile = asFile(formData.get("audioFile"));

  const hasText = Boolean(rawInput.trim());
  const fallbackTitleBase = [rawInput, url, origin].find((value) => value.trim()) || "Untitled capture";
  const title = asString(formData.get("title")) || inferTitle(fallbackTitleBase);

  const source = await createSourceFromMultimodalCapture({
    title,
    type: sourceType || "other",
    textInput: rawInput,
    sourceUrl: url,
    origin: origin || undefined,
    inputModality: inputModalityFromMode(mode, hasText),
    imageFile: imageFile
      ? {
          fileName: imageFile.name,
          mimeType: imageFile.type || "image/png",
          bytes: new Uint8Array(await imageFile.arrayBuffer())
        }
      : undefined,
    audioFile: audioFile
      ? {
          fileName: audioFile.name,
          mimeType: audioFile.type || "audio/webm",
          bytes: new Uint8Array(await audioFile.arrayBuffer())
        }
      : undefined
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

export async function deleteCaptureAction(formData: FormData) {
  const sourceId = asString(formData.get("sourceId"));

  await deleteSource(sourceId);

  revalidatePath("/capture");
  revalidatePath("/sources");
  revalidatePath(`/sources/${sourceId}`);
  revalidatePath("/review");
  revalidatePath("/progress");
  redirect("/capture");
}
