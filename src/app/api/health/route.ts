import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { cronHeartbeat } from "@/lib/db/schema";

// 10 min — one missed 5-min cron is fine; two in a row means trouble.
// Tighter would false-alarm on transient cron skew; looser would mask outages.
const STALE_AFTER_MS = 10 * 60 * 1000;

// No auth: this endpoint exposes only a timestamp + status string,
// and external uptime monitors typically can't pass custom headers.
// Designed to be hit every few minutes by an external watchdog
// (e.g. UptimeRobot) — non-2xx responses trigger alerts.
export async function GET() {
  const [hb] = await db.select().from(cronHeartbeat).limit(1);

  if (!hb) {
    // No heartbeat written yet. Either fresh deploy or scheduler has
    // never succeeded. 503 trips the watchdog so the user notices.
    return NextResponse.json(
      { status: "no heartbeat yet" },
      { status: 503 }
    );
  }

  const ageMs = Date.now() - hb.lastRunAt.getTime();

  if (ageMs > STALE_AFTER_MS) {
    return NextResponse.json(
      { status: "stale", lastRunAt: hb.lastRunAt, ageMs },
      { status: 500 }
    );
  }

  return NextResponse.json({ status: "ok", lastRunAt: hb.lastRunAt, ageMs });
}
