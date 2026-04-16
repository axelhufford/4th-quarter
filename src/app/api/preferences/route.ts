import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { notificationPreferences } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const VALID_EVENT_TYPES = [
  "game_starting",
  "4th_quarter",
  "halftime_ending",
  "close_game",
  "overtime",
  "game_ended",
];

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const prefs = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, session.user.id));

  return NextResponse.json(prefs);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { eventType?: string; enabled?: unknown; threshold?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { eventType, enabled, threshold } = body;

  if (!eventType || !VALID_EVENT_TYPES.includes(eventType)) {
    return NextResponse.json({ error: "Invalid event type" }, { status: 400 });
  }

  if (typeof enabled !== "boolean") {
    return NextResponse.json({ error: "enabled must be a boolean" }, { status: 400 });
  }

  if (threshold !== undefined && threshold !== null) {
    if (!Number.isInteger(threshold) || (threshold as number) < 0 || (threshold as number) > 50) {
      return NextResponse.json({ error: "Invalid threshold" }, { status: 400 });
    }
  }

  // Atomic upsert — avoids race condition on concurrent requests
  await db
    .insert(notificationPreferences)
    .values({
      userId: session.user.id,
      eventType,
      enabled,
      threshold: (threshold as number) ?? null,
    })
    .onConflictDoUpdate({
      target: [notificationPreferences.userId, notificationPreferences.eventType],
      set: { enabled, threshold: (threshold as number) ?? null },
    });

  return NextResponse.json({ ok: true });
}
