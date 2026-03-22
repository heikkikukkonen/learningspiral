import { NextResponse } from "next/server";
import {
  DEFAULT_USER_NOTIFICATION_SETTINGS,
  getUserNotificationSettings,
  listPushSubscriptions,
  listUsersWithMorningReminderEnabled
} from "@/lib/db";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isPushConfigured } from "@/lib/push";
import { getReminderDebugSnapshot, processMorningReminder } from "@/lib/notification-reminders";

export const dynamic = "force-dynamic";

function getCronRuntimeContext() {
  return {
    vercelEnv: process.env.VERCEL_ENV ?? null,
    vercelUrl: process.env.VERCEL_URL ?? null,
    vercelProjectProductionUrl: process.env.VERCEL_PROJECT_PRODUCTION_URL ?? null,
    vercelBranchUrl: process.env.VERCEL_BRANCH_URL ?? null,
    vercelDeploymentId: process.env.VERCEL_DEPLOYMENT_ID ?? null,
    nodeEnv: process.env.NODE_ENV ?? null,
    region: process.env.VERCEL_REGION ?? null
  };
}

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
  const runtime = getCronRuntimeContext();
  if (url.searchParams.get("debug") === "1") {
    const supabase = createSupabaseServerClient();
    const admin = getSupabaseAdmin();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const [
      settings,
      subscriptions,
      sessionSubscriptionsResult,
      sessionSettingsResult,
      adminSubscriptionsResult,
      adminSettingsResult
    ] = await Promise.all([
      getUserNotificationSettings(user.id),
      listPushSubscriptions(user.id),
      supabase.from("push_subscriptions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("user_notification_settings").select("*").eq("user_id", user.id).maybeSingle(),
      admin.from("push_subscriptions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      admin.from("user_notification_settings").select("*").eq("user_id", user.id).maybeSingle()
    ]);
    const sessionSubscriptions = sessionSubscriptionsResult.data ?? [];
    const adminSubscriptions = adminSubscriptionsResult.data ?? [];
    const sessionSettings = sessionSettingsResult.data;
    const adminSettings = adminSettingsResult.data;
    const adminDebug = {
      subscriptionCount: adminSubscriptions.length,
      subscriptions: adminSubscriptions.map((item) => ({
        endpoint: item.endpoint,
        deviceLabel: item.device_label,
        lastSentAt: item.last_sent_at,
        lastMorningReminderSentFor: item.last_morning_reminder_sent_for,
        lastErrorAt: item.last_error_at,
        lastErrorMessage: item.last_error_message
      })),
      reminder: getReminderDebugSnapshot(
        adminSettings
          ? {
              morningReminderEnabled: Boolean(adminSettings.morning_reminder_enabled),
              morningReminderTime: adminSettings.morning_reminder_time,
              morningReminderTimezone: adminSettings.morning_reminder_timezone,
              lastMorningReminderSentFor: adminSettings.last_morning_reminder_sent_for ?? null
            }
          : DEFAULT_USER_NOTIFICATION_SETTINGS
      ),
      errors: {
        subscriptions: adminSubscriptionsResult.error?.message ?? null,
        settings: adminSettingsResult.error?.message ?? null
      }
    };
    const sessionDebug = {
      subscriptionCount: sessionSubscriptions.length,
      subscriptions: sessionSubscriptions.map((item) => ({
        endpoint: item.endpoint,
        deviceLabel: item.device_label,
        lastSentAt: item.last_sent_at,
        lastMorningReminderSentFor: item.last_morning_reminder_sent_for,
        lastErrorAt: item.last_error_at,
        lastErrorMessage: item.last_error_message
      })),
      reminder: getReminderDebugSnapshot(
        sessionSettings
          ? {
              morningReminderEnabled: Boolean(sessionSettings.morning_reminder_enabled),
              morningReminderTime: sessionSettings.morning_reminder_time,
              morningReminderTimezone: sessionSettings.morning_reminder_timezone,
              lastMorningReminderSentFor: sessionSettings.last_morning_reminder_sent_for ?? null
            }
          : DEFAULT_USER_NOTIFICATION_SETTINGS
      ),
      errors: {
        subscriptions: sessionSubscriptionsResult.error?.message ?? null,
        settings: sessionSettingsResult.error?.message ?? null
      }
    };
    console.info(
      "[cron] morning-reminders.debug-views",
      JSON.stringify({
        userId: user.id,
        runtime,
        sessionView: sessionDebug,
        adminView: adminDebug
      })
    );

    return NextResponse.json({
      ok: true,
      debug: true,
      userId: user.id,
      runtime,
      pushConfigured: isPushConfigured(),
      sessionView: sessionDebug,
      adminView: adminDebug,
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
    runtime,
    processedUsers: settingsRows.length,
    handledUsers
  });
  console.info("[cron] morning-reminders.runtime", JSON.stringify(runtime));
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
