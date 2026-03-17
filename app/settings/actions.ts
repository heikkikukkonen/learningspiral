"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  deletePushSubscription,
  listPushSubscriptions,
  markPushSubscriptionSent,
  upsertPushSubscription,
  upsertUserSettings
} from "@/lib/db";
import { isPushConfigured, sendWebPush } from "@/lib/push";
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
    cardGenerationPrompt: asString(formData.get("cardGenerationPrompt")),
    tagGenerationPrompt: asString(formData.get("tagGenerationPrompt"))
  });

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

  const subscriptions = await listPushSubscriptions();
  if (subscriptions.length === 0) {
    throw new Error("No push subscriptions saved yet.");
  }

  let sentCount = 0;
  for (const subscription of subscriptions) {
    try {
      await sendWebPush(subscription.subscription_json, {
        title: "Noema",
        body: message,
        url: "/settings"
      });
      await markPushSubscriptionSent(subscription.endpoint);
      sentCount += 1;
    } catch (error) {
      const statusCode =
        typeof error === "object" &&
        error &&
        "statusCode" in error &&
        typeof error.statusCode === "number"
          ? error.statusCode
          : undefined;

      if (statusCode === 404 || statusCode === 410) {
        await deletePushSubscription(subscription.endpoint);
        continue;
      }

      throw error;
    }
  }

  revalidatePath("/settings");
  return { ok: true, sentCount };
}
