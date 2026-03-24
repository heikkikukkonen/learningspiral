"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  countReviewQueueItemsForUser,
  listPushSubscriptions,
  upsertPushSubscription,
  deletePushSubscription,
  upsertUserNotificationSettings,
  upsertUserSettings
} from "@/lib/db";
import { buildMorningReminderPayload, sendPushToUserDevices } from "@/lib/notification-reminders";
import { isPushConfigured } from "@/lib/push";
import { sanitizeUserSettings } from "@/lib/user-settings";

function asString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

function asBoolean(value: FormDataEntryValue | null): boolean {
  return value === "true";
}

export async function saveUserSettingsAction(formData: FormData) {
  const motivation = asString(formData.get("motivation"));
  const morningReminderEnabled = asBoolean(formData.get("morningReminderEnabled"));
  const morningReminderTime = asString(formData.get("morningReminderTime"));
  const morningReminderTimezone = asString(formData.get("morningReminderTimezone"));
  const settings = sanitizeUserSettings({
    responseLanguage: asString(formData.get("responseLanguage")),
    analysisPromptRefresh: asString(formData.get("analysisPromptRefresh")),
    analysisPromptDeepen: asString(formData.get("analysisPromptDeepen")),
    analysisPromptSummarize: asString(formData.get("analysisPromptSummarize")),
    cardGenerationPrompt: asString(formData.get("cardGenerationPrompt")),
    recallCardGenerationPrompt: asString(formData.get("recallCardGenerationPrompt")),
    applyCardGenerationPrompt: asString(formData.get("applyCardGenerationPrompt")),
    reflectCardGenerationPrompt: asString(formData.get("reflectCardGenerationPrompt")),
    discussCardGenerationPrompt: asString(formData.get("discussCardGenerationPrompt")),
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
  await upsertUserNotificationSettings(
    {
      morningReminderEnabled,
      morningReminderTime,
      morningReminderTimezone
    },
    user?.id
  );

  revalidatePath("/settings");
  revalidatePath("/login");
  revalidatePath("/capture");
  revalidatePath("/sources");
  redirect("/settings?saved=1");
}

export async function savePushSubscriptionAction(input: {
  endpoint: string;
  subscription: Record<string, unknown>;
  deviceLabel?: string;
}) {
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

  const endpoint = input.endpoint.trim();
  if (!endpoint) {
    throw new Error("Push subscription endpoint is missing.");
  }

  await upsertPushSubscription({
    endpoint,
    subscription: input.subscription,
    deviceLabel: input.deviceLabel,
    userId: user.id
  });

  revalidatePath("/settings");
  return { ok: true };
}

export async function deletePushSubscriptionAction(endpoint: string) {
  const trimmedEndpoint = endpoint.trim();
  if (!trimmedEndpoint) {
    return { ok: true };
  }

  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  await deletePushSubscription(trimmedEndpoint, user.id);
  revalidatePath("/settings");
  return { ok: true };
}

export async function sendQueueReminderTestAction() {
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
  if (!subscriptions.length) {
    throw new Error("Ilmoituksia ei ole otettu käyttöön yhdelläkään laitteella.");
  }

  const queueCount = await countReviewQueueItemsForUser(user.id);
  const result = await sendPushToUserDevices(user.id, buildMorningReminderPayload(queueCount));

  revalidatePath("/settings");
  return {
    ok: true,
    queueCount,
    sentCount: result.sentCount,
    failureCount: result.failureCount
  };
}
