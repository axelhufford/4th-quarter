import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { notificationPreferences } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

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

  const body = await req.json();
  const { eventType, enabled, threshold } = body as {
    eventType: string;
    enabled: boolean;
    threshold?: number;
  };

  // Upsert preference
  const existing = await db
    .select()
    .from(notificationPreferences)
    .where(
      and(
        eq(notificationPreferences.userId, session.user.id),
        eq(notificationPreferences.eventType, eventType)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(notificationPreferences)
      .set({ enabled, threshold: threshold ?? null })
      .where(eq(notificationPreferences.id, existing[0].id));
  } else {
    await db.insert(notificationPreferences).values({
      userId: session.user.id,
      eventType,
      enabled,
      threshold: threshold ?? null,
    });
  }

  return NextResponse.json({ ok: true });
}
