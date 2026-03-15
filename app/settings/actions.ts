"use server";

import { revalidatePath } from "next/cache";
import { upsertUserSettings } from "@/lib/db";
import { sanitizeUserSettings } from "@/lib/user-settings";

function asString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

export async function saveUserSettingsAction(formData: FormData) {
  const settings = sanitizeUserSettings({
    responseLanguage: asString(formData.get("responseLanguage")),
    analysisPromptRefresh: asString(formData.get("analysisPromptRefresh")),
    analysisPromptDeepen: asString(formData.get("analysisPromptDeepen")),
    analysisPromptSummarize: asString(formData.get("analysisPromptSummarize")),
    cardGenerationPrompt: asString(formData.get("cardGenerationPrompt"))
  });

  await upsertUserSettings(settings);

  revalidatePath("/settings");
  revalidatePath("/login");
  revalidatePath("/capture");
  revalidatePath("/sources");
}
