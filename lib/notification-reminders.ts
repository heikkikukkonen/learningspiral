import {
  countReviewQueueItemsForUser,
  deletePushSubscription,
  listPushSubscriptions,
  markPushSubscriptionError,
  markPushSubscriptionSent,
  type PushSubscriptionRow,
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
    return { sentCount: 0, failureCount: 0, results: [] as Array<Record<string, unknown>> };
  }

  let sentCount = 0;
  let failureCount = 0;
  const results: Array<Record<string, unknown>> = [];
  for (const subscription of subscriptions) {
    try {
      await sendWebPush(subscription.subscription_json, payload);
      await markPushSubscriptionSent(subscription.endpoint, userId);
      sentCount += 1;
      results.push({
        endpoint: subscription.endpoint,
        deviceLabel: subscription.device_label,
        status: "sent"
      });
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
        results.push({
          endpoint: subscription.endpoint,
          deviceLabel: subscription.device_label,
          status: "deleted",
          statusCode
        });
        continue;
      }

      failureCount += 1;
      const message = error instanceof Error ? error.message : String(error);
      await markPushSubscriptionError(subscription.endpoint, message, userId);
      results.push({
        endpoint: subscription.endpoint,
        deviceLabel: subscription.device_label,
        status: "failed",
        statusCode,
        error: message
      });
    }
  }

  return { sentCount, failureCount, results };
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

function getPendingReminderSubscriptions(subscriptions: PushSubscriptionRow[], localDate: string) {
  return subscriptions.filter((subscription) => subscription.last_morning_reminder_sent_for !== localDate);
}

function getAlreadySentReminderSubscriptions(subscriptions: PushSubscriptionRow[], localDate: string) {
  return subscriptions.filter((subscription) => subscription.last_morning_reminder_sent_for === localDate);
}

export async function sendMorningReminderToUser(userId: string, localDate: string) {
  const queueCount = await countReviewQueueItemsForUser(userId);
  const payload = buildMorningReminderPayload(queueCount);
  const subscriptions = await listPushSubscriptions(userId);
  const alreadySentSubscriptions = getAlreadySentReminderSubscriptions(subscriptions, localDate);
  const pendingSubscriptions = getPendingReminderSubscriptions(subscriptions, localDate);
  const results: Array<Record<string, unknown>> = alreadySentSubscriptions.map((subscription) => ({
    endpoint: subscription.endpoint,
    deviceLabel: subscription.device_label,
    status: "skipped_already_sent",
    sentFor: localDate
  }));

  if (!pendingSubscriptions.length) {
    return {
      queueCount,
      sentCount: 0,
      failureCount: 0,
      skippedCount: alreadySentSubscriptions.length,
      deletedCount: 0,
      payload,
      results
    };
  }

  let sentCount = 0;
  let failureCount = 0;
  let skippedCount = alreadySentSubscriptions.length;
  let deletedCount = 0;

  for (const subscription of pendingSubscriptions) {
    try {
      await sendWebPush(subscription.subscription_json, payload);
      await markPushSubscriptionSent(subscription.endpoint, userId, {
        reminderSentFor: localDate
      });
      sentCount += 1;
      results.push({
        endpoint: subscription.endpoint,
        deviceLabel: subscription.device_label,
        status: "sent",
        sentFor: localDate
      });
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
        deletedCount += 1;
        results.push({
          endpoint: subscription.endpoint,
          deviceLabel: subscription.device_label,
          status: "deleted",
          statusCode
        });
        continue;
      }

      failureCount += 1;
      const message = error instanceof Error ? error.message : String(error);
      await markPushSubscriptionError(subscription.endpoint, message, userId);
      results.push({
        endpoint: subscription.endpoint,
        deviceLabel: subscription.device_label,
        status: "failed",
        statusCode,
        error: message
      });
    }
  }

  return { queueCount, sentCount, failureCount, skippedCount, deletedCount, payload, results };
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

  const subscriptions = await listPushSubscriptions(settings.user_id);
  const alreadySentSubscriptions = getAlreadySentReminderSubscriptions(subscriptions, localDate);
  const pendingSubscriptions = getPendingReminderSubscriptions(subscriptions, localDate);
  if (!pendingSubscriptions.length) {
    return {
      processed: false,
      reason: "all_devices_already_sent" as const,
      localDate,
      queueCount: null,
      sentCount: 0,
      failureCount: 0,
      skippedCount: alreadySentSubscriptions.length,
      deletedCount: 0,
      results: alreadySentSubscriptions.map((subscription) => ({
        endpoint: subscription.endpoint,
        deviceLabel: subscription.device_label,
        status: "skipped_already_sent",
        sentFor: localDate
      }))
    };
  }

  const { queueCount, sentCount, failureCount, skippedCount, deletedCount, results } = await sendMorningReminderToUser(
    settings.user_id,
    localDate
  );

  return {
    processed: sentCount > 0 || failureCount > 0 || skippedCount > 0,
    reason: "sent" as const,
    localDate,
    queueCount,
    sentCount,
    failureCount,
    skippedCount,
    deletedCount,
    results
  };
}
