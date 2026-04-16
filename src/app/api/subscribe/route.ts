import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { pushSubscriptions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { endpoint, keys } = body;

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json(
      { error: "Invalid subscription data" },
      { status: 400 }
    );
  }

  // Check if endpoint already exists
  const existing = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, endpoint))
    .limit(1);

  if (existing.length > 0) {
    // Only allow updating if the subscription belongs to this user
    if (existing[0].userId !== session.user.id) {
      return NextResponse.json({ error: "Subscription conflict" }, { status: 409 });
    }
    await db
      .update(pushSubscriptions)
      .set({ p256dhKey: keys.p256dh, authKey: keys.auth })
      .where(
        and(
          eq(pushSubscriptions.endpoint, endpoint),
          eq(pushSubscriptions.userId, session.user.id)
        )
      );
  } else {
    await db
      .insert(pushSubscriptions)
      .values({
        userId: session.user.id,
        endpoint,
        p256dhKey: keys.p256dh,
        authKey: keys.auth,
      })
      .onConflictDoNothing();
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { endpoint?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { endpoint } = body;

  if (endpoint) {
    // Only delete subscriptions belonging to the current user
    await db
      .delete(pushSubscriptions)
      .where(
        and(
          eq(pushSubscriptions.endpoint, endpoint),
          eq(pushSubscriptions.userId, session.user.id)
        )
      );
  }

  return NextResponse.json({ ok: true });
}
