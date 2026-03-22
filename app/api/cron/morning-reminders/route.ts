import { NextResponse } from "next/server";
import { listUsersWithMorningReminderEnabled } from "@/lib/db";
import { isPushConfigured } from "@/lib/push";
import { processMorningReminder } from "@/lib/notification-reminders";

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
