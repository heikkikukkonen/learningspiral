"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  deletePushSubscription,
  getUserNotificationSettings,
  listPushSubscriptions,
  upsertPushSubscription,
  upsertUserNotificationSettings,
  upsertUserSettings
} from "@/lib/db";
import {
  sendMorningReminderToUser,
  sendPushToUserDevices
} from "@/lib/notification-reminders";
import { isPushConfigured } from "@/lib/push";
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

  revalidatePath("/settings");
  revalidatePath("/login");
  revalidatePath("/capture");
  revalidatePath("/sources");
  redirect("/settings?saved=1");
}

export async function savePushSubscriptionAction(input: {
  endpoint: string;
  subscription: Record<string, unknown>;
}) {
  if (!isPushConfigured()) {
    throw new Error("Push notifications are not configured on the server.");
  }

  if (!input.endpoint.trim()) {
    throw new Error("Push subscription endpoint is missing.");
  }

  await upsertPushSubscription({
    endpoint: input.endpoint.trim(),
    subscription: input.subscription
  });

  revalidatePath("/settings");
  return { ok: true };
}

export async function saveMorningReminderSettingsAction(input: {
  enabled: boolean;
  time: string;
  timezone: string;
}) {
  const current = await getUserNotificationSettings();
  const settings = await upsertUserNotificationSettings({
    ...current,
    morningReminderEnabled: input.enabled,
    morningReminderTime: input.time,
    morningReminderTimezone: input.timezone
  });

  revalidatePath("/settings");
  return settings;
}

export async function deletePushSubscriptionAction(endpoint: string) {
  if (!endpoint.trim()) {
    return { ok: true };
  }

  await deletePushSubscription(endpoint.trim());
  revalidatePath("/settings");
  return { ok: true };
}

export async function sendPushTestAction(input: { message: string }) {
  if (!isPushConfigured()) {
    throw new Error("Push notifications are not configured on the server.");
  }

  const message = input.message.trim();
  if (!message) {
    throw new Error("Push test message is empty.");
  }

  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const subscriptions = await listPushSubscriptions(user.id);
  if (subscriptions.length === 0) {
    throw new Error("No push subscriptions saved yet.");
  }

  const result = await sendPushToUserDevices(user.id, {
    title: "Noema",
    body: message,
    url: "/settings"
  });

  revalidatePath("/settings");
  return { ok: true, sentCount: result.sentCount };
}

export async function sendMorningReminderPreviewAction() {
  if (!isPushConfigured()) {
    throw new Error("Push notifications are not configured on the server.");
  }

  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const subscriptions = await listPushSubscriptions(user.id);
  if (subscriptions.length === 0) {
    throw new Error("Tälle käyttäjälle ei ole vielä yhtään aktiivista ilmoituslaitetta.");
  }

  const result = await sendMorningReminderToUser(user.id);
  revalidatePath("/settings");
  return { ok: true, sentCount: result.sentCount, queueCount: result.queueCount };
}
