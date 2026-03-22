"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  countReviewQueueItemsForUser,
  deletePushSubscription,
  getUserNotificationSettings,
  listPushSubscriptions,
  markPushSubscriptionError,
  markPushSubscriptionSent,
  upsertPushSubscription,
  upsertUserNotificationSettings,
  upsertUserSettings
} from "@/lib/db";
import {
  buildMorningReminderPayload,
  sendPushToUserDevices
} from "@/lib/notification-reminders";
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
      morningReminderEnabled,
      morningReminderTime,
      morningReminderTimezone,
      lastMorningReminderSentFor: morningReminderEnabled
        ? currentNotificationSettings.lastMorningReminderSentFor
        : null
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

  if (!input.endpoint.trim()) {
    throw new Error("Push subscription endpoint is missing.");
  }

  await upsertPushSubscription({
    endpoint: input.endpoint.trim(),
    subscription: input.subscription,
    deviceLabel: input.deviceLabel
  });

  revalidatePath("/settings");
  return { ok: true };
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
  return { ok: true, sentCount: result.sentCount, failureCount: result.failureCount, results: result.results };
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

  const queueCount = await countReviewQueueItemsForUser(user.id);
  const result = await sendPushToUserDevices(user.id, buildMorningReminderPayload(queueCount));
  revalidatePath("/settings");
  return {
    ok: true,
    sentCount: result.sentCount,
    failureCount: result.failureCount,
    queueCount,
    results: result.results
  };
}

export async function sendMorningReminderToDeviceAction(endpoint: string) {
  if (!isPushConfigured()) {
    throw new Error("Push notifications are not configured on the server.");
  }

  const trimmedEndpoint = endpoint.trim();
  if (!trimmedEndpoint) {
    throw new Error("Push subscription endpoint is missing.");
  }

  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const subscriptions = await listPushSubscriptions(user.id);
  const subscription = subscriptions.find((item) => item.endpoint === trimmedEndpoint);
  if (!subscription) {
    throw new Error("Valittua laitetta ei löytynyt.");
  }

  const queueCount = await countReviewQueueItemsForUser(user.id);
  try {
    const { sendWebPush } = await import("@/lib/push");
    await sendWebPush(subscription.subscription_json, buildMorningReminderPayload(queueCount));
    await markPushSubscriptionSent(subscription.endpoint, user.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await markPushSubscriptionError(subscription.endpoint, message, user.id);
    throw error;
  }

  revalidatePath("/settings");
  return {
    ok: true,
    queueCount,
    endpoint: subscription.endpoint,
    deviceLabel: subscription.device_label
  };
}
