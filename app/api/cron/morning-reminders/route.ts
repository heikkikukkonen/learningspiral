import { NextResponse } from "next/server";
import { listPushSubscriptions, listUsersWithMorningReminderEnabled } from "@/lib/db";
import { processMorningReminder } from "@/lib/notification-reminders";
import { isPushConfigured } from "@/lib/push";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request) {
  const configuredSecret = process.env.CRON_SECRET?.trim();
  if (!configuredSecret) {
    return true;
  }

  const header = request.headers.get("authorization") ?? "";
  return header === `Bearer ${configuredSecret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!isPushConfigured()) {
    return NextResponse.json({ ok: true, skipped: true, reason: "push_not_configured" });
  }

  const settingsRows = await listUsersWithMorningReminderEnabled();
  const dbSnapshot = await Promise.all(
    settingsRows.map(async (settings) => {
      const subscriptions = await listPushSubscriptions(settings.user_id);
      return {
        userId: settings.user_id,
        reminder: {
          enabled: settings.morningReminderEnabled,
          targetTime: settings.morningReminderTime,
          timezone: settings.morningReminderTimezone,
          lastSentFor: settings.lastMorningReminderSentFor,
          createdAt: "created_at" in settings ? settings.created_at : null,
          updatedAt: "updated_at" in settings ? settings.updated_at : null
        },
        subscriptionCount: subscriptions.length,
        subscriptions: subscriptions.map((item) => ({
          endpoint: item.endpoint,
          deviceLabel: item.device_label,
          createdAt: item.created_at,
          updatedAt: item.updated_at,
          lastSentAt: item.last_sent_at,
          lastReminderSentFor: item.last_morning_reminder_sent_for,
          lastErrorAt: item.last_error_at,
          lastErrorMessage: item.last_error_message
        }))
      };
    })
  );
  console.info("[cron] morning-reminders.db", JSON.stringify(dbSnapshot));
  const results = await Promise.all(settingsRows.map((settings) => processMorningReminder(settings)));

  return NextResponse.json({
    ok: true,
    processedUsers: settingsRows.length,
    sentUsers: results.filter((result) => result.processed).length,
    sentDevices: results.reduce(
      (sum, result) => sum + ("sentCount" in result && typeof result.sentCount === "number" ? result.sentCount : 0),
      0
    )
  });
}
