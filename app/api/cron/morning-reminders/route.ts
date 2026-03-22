import { NextResponse } from "next/server";
import {
  getUserNotificationSettings,
  listPushSubscriptions,
  listUsersWithMorningReminderEnabled
} from "@/lib/db";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isPushConfigured } from "@/lib/push";
import { getReminderDebugSnapshot, processMorningReminder } from "@/lib/notification-reminders";

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
  const url = new URL(request.url);
  if (url.searchParams.get("debug") === "1") {
    const supabase = createSupabaseServerClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const [settings, subscriptions] = await Promise.all([
      getUserNotificationSettings(user.id),
      listPushSubscriptions(user.id)
    ]);

    return NextResponse.json({
      ok: true,
      debug: true,
      userId: user.id,
      pushConfigured: isPushConfigured(),
      subscriptions: subscriptions.map((item) => ({
        endpoint: item.endpoint,
        deviceLabel: item.device_label,
        lastSentAt: item.last_sent_at,
        lastMorningReminderSentFor: item.last_morning_reminder_sent_for,
        lastErrorAt: item.last_error_at,
        lastErrorMessage: item.last_error_message
      })),
      reminder: getReminderDebugSnapshot(settings)
    });
  }

  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!isPushConfigured()) {
    return NextResponse.json({ ok: true, skipped: true, reason: "push_not_configured" });
  }

  const settingsRows = await listUsersWithMorningReminderEnabled();
  const results = await Promise.all(settingsRows.map((settings) => processMorningReminder(settings)));
  const handledUsers = settingsRows.map((settings, index) => {
    const result = results[index];

    return {
      userId: settings.user_id,
      processed: result.processed,
      reason: result.reason,
      localDate: "localDate" in result ? result.localDate : null,
      queueCount: "queueCount" in result ? result.queueCount : null,
      sentCount: "sentCount" in result ? result.sentCount : 0,
      failureCount: "failureCount" in result ? result.failureCount : 0,
      skippedCount: "skippedCount" in result ? result.skippedCount : 0,
      deletedCount: "deletedCount" in result ? result.deletedCount : 0,
      deviceResults: "results" in result ? result.results : []
    };
  });
  console.info("[cron] morning-reminders", {
    processedUsers: settingsRows.length,
    handledUsers
  });
  console.info("[cron] morning-reminders.json", JSON.stringify(handledUsers));
  for (const handledUser of handledUsers) {
    console.info("[cron] morning-reminders.user", JSON.stringify(handledUser));
    for (const deviceResult of handledUser.deviceResults ?? []) {
      console.info(
        "[cron] morning-reminders.device",
        JSON.stringify({
          userId: handledUser.userId,
          localDate: handledUser.localDate,
          reason: handledUser.reason,
          ...deviceResult
        })
      );
    }
  }

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
