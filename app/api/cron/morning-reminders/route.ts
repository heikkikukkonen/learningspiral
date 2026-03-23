import { NextResponse } from "next/server";
import { getUserPushDebugSnapshot, listUsersWithMorningReminderEnabled } from "@/lib/db";
import { processMorningReminder } from "@/lib/notification-reminders";
import { isPushConfigured } from "@/lib/push";

export const dynamic = "force-dynamic";

function isLikelyValidVapidSubject(value: string | undefined) {
  if (!value) return false;
  return value.startsWith("mailto:") || value.startsWith("https://");
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
  const requestUrl = new URL(request.url);
  const dryRun = requestUrl.searchParams.get("dryRun") === "1";

  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!isPushConfigured()) {
    return NextResponse.json({ ok: true, skipped: true, reason: "push_not_configured" });
  }

  const envSnapshot = {
    pushConfigured: isPushConfigured(),
    vapidSubject: process.env.VAPID_SUBJECT ?? null,
    hasValidVapidSubject: isLikelyValidVapidSubject(process.env.VAPID_SUBJECT)
  };
  console.info("[cron] morning-reminders.env", JSON.stringify(envSnapshot));
  const settingsRows = await listUsersWithMorningReminderEnabled();
  const userIds = settingsRows.map((settings) => settings.user_id);
  const dbSnapshotBefore = await Promise.all(userIds.map((userId) => getUserPushDebugSnapshot(userId)));
  console.info("[cron] morning-reminders.db", JSON.stringify(dbSnapshotBefore));

  if (dryRun) {
    return NextResponse.json(
      {
        ok: true,
        dryRun: true,
        generatedAt: new Date().toISOString(),
        ...envSnapshot,
        processedUsers: settingsRows.length,
        sentUsers: 0,
        sentDevices: 0,
        dbSnapshotBefore
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, max-age=0, must-revalidate"
        }
      }
    );
  }

  const results = await Promise.all(settingsRows.map((settings) => processMorningReminder(settings)));
  const dbSnapshotAfter = await Promise.all(userIds.map((userId) => getUserPushDebugSnapshot(userId)));

  return NextResponse.json(
    {
      ok: true,
      dryRun: false,
      generatedAt: new Date().toISOString(),
      ...envSnapshot,
      processedUsers: settingsRows.length,
      sentUsers: results.filter((result) => result.processed).length,
      sentDevices: results.reduce(
        (sum, result) => sum + ("sentCount" in result && typeof result.sentCount === "number" ? result.sentCount : 0),
        0
      ),
      dbSnapshotBefore,
      dbSnapshotAfter
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, max-age=0, must-revalidate"
      }
    }
  );
}
