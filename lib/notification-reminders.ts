import {
  countReviewQueueItemsForUser,
  deletePushSubscription,
  listPushSubscriptions,
  markMorningReminderSent,
  markPushSubscriptionSent,
  type UserNotificationSettingsRow
} from "@/lib/db";
import { sendWebPush, type PushPayload } from "@/lib/push";

function getLocalDateParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });

  const parts = formatter.formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute")
  };
}

export function getReminderDebugSnapshot(
  settings: Pick<
    UserNotificationSettingsRow,
    "morningReminderEnabled" | "morningReminderTime" | "morningReminderTimezone" | "lastMorningReminderSentFor"
  >,
  now = new Date()
) {
  const local = getLocalDateParts(now, settings.morningReminderTimezone);
  const localDate = `${local.year}-${local.month}-${local.day}`;
  const localTime = `${local.hour}:${local.minute}`;
  const dueCheck = isReminderDueNow(settings, now);

  return {
    enabled: settings.morningReminderEnabled,
    targetTime: settings.morningReminderTime,
    timezone: settings.morningReminderTimezone,
    lastSentFor: settings.lastMorningReminderSentFor,
    nowUtc: now.toISOString(),
    localDate,
    localTime,
    dueNow: dueCheck.due
  };
}

export function buildMorningReminderPayload(queueCount: number): PushPayload {
  return {
    title: "Noema",
    body: `Sinulla on ${queueCount} ${queueCount === 1 ? "asia" : "asiaa"} syvennettävänä.`,
    url: "/review"
  };
}

export async function sendPushToUserDevices(userId: string, payload: PushPayload) {
  const subscriptions = await listPushSubscriptions(userId);
  if (subscriptions.length === 0) {
    return { sentCount: 0 };
  }

  let sentCount = 0;
  for (const subscription of subscriptions) {
    try {
      await sendWebPush(subscription.subscription_json, payload);
      await markPushSubscriptionSent(subscription.endpoint, userId);
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
        await deletePushSubscription(subscription.endpoint, userId);
        continue;
      }

      throw error;
    }
  }

  return { sentCount };
}

export function isReminderDueNow(
  settings: Pick<
    UserNotificationSettingsRow,
    "morningReminderTime" | "morningReminderTimezone" | "lastMorningReminderSentFor"
  >,
  now: Date
) {
  const local = getLocalDateParts(now, settings.morningReminderTimezone);
  const nowTotalMinutes = Number(local.hour) * 60 + Number(local.minute);
  const [targetHour, targetMinute] = settings.morningReminderTime.split(":").map(Number);
  const targetTotalMinutes = targetHour * 60 + targetMinute;
  const localDate = `${local.year}-${local.month}-${local.day}`;

  return {
    localDate,
    due: nowTotalMinutes >= targetTotalMinutes && settings.lastMorningReminderSentFor !== localDate
  };
}

export async function sendMorningReminderToUser(userId: string) {
  const queueCount = await countReviewQueueItemsForUser(userId);
  const payload = buildMorningReminderPayload(queueCount);
  const result = await sendPushToUserDevices(userId, payload);
  return { queueCount, sentCount: result.sentCount, payload };
}

export async function processMorningReminder(
  settings: Pick<
    UserNotificationSettingsRow,
    | "user_id"
    | "morningReminderEnabled"
    | "morningReminderTime"
    | "morningReminderTimezone"
    | "lastMorningReminderSentFor"
  >,
  now = new Date()
) {
  if (!settings.morningReminderEnabled) {
    return { processed: false, reason: "disabled" as const };
  }

  const { due, localDate } = isReminderDueNow(settings, now);
  if (!due) {
    return { processed: false, reason: "not_due" as const, localDate };
  }

  const { queueCount, sentCount } = await sendMorningReminderToUser(settings.user_id);
  await markMorningReminderSent(settings.user_id, localDate);

  return {
    processed: true,
    reason: "sent" as const,
    localDate,
    queueCount,
    sentCount
  };
}
