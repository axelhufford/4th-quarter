import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { pushSubscriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
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
    return NextResponse.json({ error: "No push subscription found" }, { status: 400 });
  }

  let sent = 0;
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
  }

  return NextResponse.json({ sent });
}
