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
    second: "2-digit",
    hour12: false
  });

  const parts = formatter.formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second")
  };
}

function getTimeZoneOffsetMs(date: Date, timeZone: string) {
  const local = getLocalDateParts(date, timeZone);
  const asUtcTimestamp = Date.UTC(
    Number(local.year),
    Number(local.month) - 1,
    Number(local.day),
    Number(local.hour),
    Number(local.minute),
    Number(local.second)
  );

  return asUtcTimestamp - date.getTime();
}

function getReminderTargetTimestamp(localDate: string, localTime: string, timeZone: string) {
  const [year, month, day] = localDate.split("-").map(Number);
  const [hour, minute] = localTime.split(":").map(Number);
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const initialOffset = getTimeZoneOffsetMs(utcGuess, timeZone);
  let target = new Date(utcGuess.getTime() - initialOffset);
  const adjustedOffset = getTimeZoneOffsetMs(target, timeZone);

  if (adjustedOffset !== initialOffset) {
    target = new Date(utcGuess.getTime() - adjustedOffset);
  }

  return target;
}

function getReminderTiming(
  settings: Pick<UserNotificationSettingsRow, "morningReminderTime" | "morningReminderTimezone">,
  now: Date
) {
  const local = getLocalDateParts(now, settings.morningReminderTimezone);
  const localDate = `${local.year}-${local.month}-${local.day}`;
  const localTime = `${local.hour}:${local.minute}`;
  const reminderAt = getReminderTargetTimestamp(
    localDate,
    settings.morningReminderTime,
    settings.morningReminderTimezone
  );

  return {
    localDate,
    localTime,
    reminderAt
  };
}

function hasReminderBeenSentSince(
  subscription: Pick<PushSubscriptionRow, "last_sent_at">,
  reminderAt: Date
) {
  if (!subscription.last_sent_at) {
    return false;
  }

  const lastSentAt = new Date(subscription.last_sent_at);
  if (Number.isNaN(lastSentAt.getTime())) {
    return false;
  }

  return lastSentAt.getTime() >= reminderAt.getTime();
}

export function getReminderDebugSnapshot(
  settings: Pick<UserNotificationSettingsRow, "morningReminderEnabled" | "morningReminderTime" | "morningReminderTimezone">,
  now = new Date()
) {
  const timing = getReminderTiming(settings, now);

  return {
    enabled: settings.morningReminderEnabled,
    targetTime: settings.morningReminderTime,
    timezone: settings.morningReminderTimezone,
    nowUtc: now.toISOString(),
    localDate: timing.localDate,
    localTime: timing.localTime,
    reminderAtUtc: timing.reminderAt.toISOString(),
    dueNow: now.getTime() >= timing.reminderAt.getTime()
  };
}

export function buildMorningReminderPayload(queueCount: number): PushPayload {
  return {
    title: "Noema",
    body: `Sinulla on ${queueCount} ${queueCount === 1 ? "asia" : "asiaa"} syvennett\u00E4v\u00E4n\u00E4.`,
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
      await markPushSubscriptionSent(subscription.endpoint, userId, { recordSentAt: false });
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
  settings: Pick<UserNotificationSettingsRow, "morningReminderTime" | "morningReminderTimezone">,
  now: Date
) {
  const timing = getReminderTiming(settings, now);

  return {
    localDate: timing.localDate,
    reminderAt: timing.reminderAt,
    due: now.getTime() >= timing.reminderAt.getTime()
  };
}

function getPendingReminderSubscriptions(subscriptions: PushSubscriptionRow[], reminderAt: Date) {
  return subscriptions.filter((subscription) => !hasReminderBeenSentSince(subscription, reminderAt));
}

function getAlreadySentReminderSubscriptions(subscriptions: PushSubscriptionRow[], reminderAt: Date) {
  return subscriptions.filter((subscription) => hasReminderBeenSentSince(subscription, reminderAt));
}

export async function sendMorningReminderToUser(userId: string, reminderAt: Date, localDate: string) {
  const queueCount = await countReviewQueueItemsForUser(userId);
  const payload = buildMorningReminderPayload(queueCount);
  const subscriptions = await listPushSubscriptions(userId);
  const alreadySentSubscriptions = getAlreadySentReminderSubscriptions(subscriptions, reminderAt);
  const pendingSubscriptions = getPendingReminderSubscriptions(subscriptions, reminderAt);
  const results: Array<Record<string, unknown>> = alreadySentSubscriptions.map((subscription) => ({
    endpoint: subscription.endpoint,
    deviceLabel: subscription.device_label,
    status: "skipped_already_sent",
    lastSentAt: subscription.last_sent_at,
    reminderAtUtc: reminderAt.toISOString()
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
      await markPushSubscriptionSent(subscription.endpoint, userId);
      sentCount += 1;
      results.push({
        endpoint: subscription.endpoint,
        deviceLabel: subscription.device_label,
        status: "sent",
        localDate,
        reminderAtUtc: reminderAt.toISOString()
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
    "user_id" | "morningReminderEnabled" | "morningReminderTime" | "morningReminderTimezone"
  >,
  now = new Date()
) {
  if (!settings.morningReminderEnabled) {
    return { processed: false, reason: "disabled" as const };
  }

  const { due, localDate, reminderAt } = isReminderDueNow(settings, now);
  if (!due) {
    return { processed: false, reason: "not_due" as const, localDate, reminderAtUtc: reminderAt.toISOString() };
  }

  const subscriptions = await listPushSubscriptions(settings.user_id);
  const alreadySentSubscriptions = getAlreadySentReminderSubscriptions(subscriptions, reminderAt);
  const pendingSubscriptions = getPendingReminderSubscriptions(subscriptions, reminderAt);
  if (!pendingSubscriptions.length) {
    return {
      processed: false,
      reason: "all_devices_already_sent" as const,
      localDate,
      reminderAtUtc: reminderAt.toISOString(),
      queueCount: null,
      sentCount: 0,
      failureCount: 0,
      skippedCount: alreadySentSubscriptions.length,
      deletedCount: 0,
      results: alreadySentSubscriptions.map((subscription) => ({
        endpoint: subscription.endpoint,
        deviceLabel: subscription.device_label,
        status: "skipped_already_sent",
        lastSentAt: subscription.last_sent_at,
        reminderAtUtc: reminderAt.toISOString()
      }))
    };
  }

  const { queueCount, sentCount, failureCount, skippedCount, deletedCount, results } = await sendMorningReminderToUser(
    settings.user_id,
    reminderAt,
    localDate
  );

  return {
    processed: sentCount > 0 || failureCount > 0 || skippedCount > 0,
    reason: "sent" as const,
    localDate,
    reminderAtUtc: reminderAt.toISOString(),
    queueCount,
    sentCount,
    failureCount,
    skippedCount,
    deletedCount,
    results
  };
}
