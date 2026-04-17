import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { pushSubscriptions } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { sendPushNotification } from "@/lib/notifications/web-push";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const subs = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, session.user.id));

  if (subs.length === 0) {
    return NextResponse.json(
      { error: "No push subscription found. Enable notifications first." },
      { status: 400 }
    );
  }

  let sent = 0;
  const goneSubIds: number[] = [];

  for (const sub of subs) {
    const result = await sendPushNotification(
      { endpoint: sub.endpoint, p256dhKey: sub.p256dhKey, authKey: sub.authKey },
      {
        title: "4th Quarter - Test",
        body: "Notifications are working! You'll get alerts when your games heat up.",
        icon: "/icon-192.png",
      }
    );
    if (result.success) sent++;
    if (result.gone) goneSubIds.push(sub.id);
  }

  // Clean up expired / unregistered endpoints so they don't linger in the DB
  if (goneSubIds.length > 0) {
    await db
      .delete(pushSubscriptions)
      .where(inArray(pushSubscriptions.id, goneSubIds));
  }

  // If zero succeeded, surface that as an error — otherwise the UI shows
  // "success" when nothing actually got through (e.g., all endpoints are stale).
  if (sent === 0) {
    return NextResponse.json(
      {
        error:
          goneSubIds.length > 0
            ? "Your push subscription expired. Re-enable notifications."
            : "Test notification failed to send.",
        sent: 0,
        total: subs.length,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    sent,
    total: subs.length,
    cleaned: goneSubIds.length,
  });
}
