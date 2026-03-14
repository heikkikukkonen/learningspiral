"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { deleteSource, listCaptureMessages, respondInCapture, upsertSummary } from "@/lib/db";

function asString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
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
