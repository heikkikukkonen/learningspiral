"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserNotificationSettings, upsertUserNotificationSettings, upsertUserSettings } from "@/lib/db";
import { sanitizeUserSettings } from "@/lib/user-settings";

function asString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

export async function saveUserSettingsAction(formData: FormData) {
  const motivation = asString(formData.get("motivation"));
  const settings = sanitizeUserSettings({
    responseLanguage: asString(formData.get("responseLanguage")),
    analysisPromptRefresh: asString(formData.get("analysisPromptRefresh")),
    analysisPromptDeepen: asString(formData.get("analysisPromptDeepen")),
    analysisPromptSummarize: asString(formData.get("analysisPromptSummarize")),
    cardGenerationPrompt: asString(formData.get("cardGenerationPrompt")),
    tagGenerationPrompt: asString(formData.get("tagGenerationPrompt"))
  });

  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (user) {
    const { error } = await supabase.auth.updateUser({
      data: {
        ...user.user_metadata,
        motivation
      }
    });

    if (error) {
      throw error;
    }
  }

  await upsertUserSettings(settings);
  const currentNotificationSettings = await getUserNotificationSettings(user?.id);
  await upsertUserNotificationSettings(
    {
      ...currentNotificationSettings,
      morningReminderEnabled: false,
      lastMorningReminderSentFor: null
    },
    user?.id
  );

  revalidatePath("/settings");
  revalidatePath("/login");
  revalidatePath("/capture");
  revalidatePath("/sources");
  redirect("/settings?saved=1");
}
