import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { users, notificationLog } from "@/lib/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { sendEmailNotification } from "@/lib/notifications/email";

const TEST_EMAIL_COOLDOWN_MS = 60_000;

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: at most one test email per minute per user.
  // We piggy-back on notification_log so the check works across serverless
  // instances without needing a separate store.
  const cutoff = new Date(Date.now() - TEST_EMAIL_COOLDOWN_MS);
  const recent = await db
    .select({ id: notificationLog.id })
    .from(notificationLog)
    .where(
      and(
        eq(notificationLog.userId, session.user.id),
        eq(notificationLog.eventType, "test_email"),
        gt(notificationLog.sentAt, cutoff)
      )
    )
    .limit(1);

  if (recent.length > 0) {
    return NextResponse.json(
      { error: "Please wait a minute before sending another test email." },
      { status: 429 }
    );
  }

  const [user] = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, session.user.id));

  if (!user?.email) {
    return NextResponse.json({ error: "No email found" }, { status: 400 });
  }

  const result = await sendEmailNotification(user.email, {
    title: "4th Quarter - Test",
    body: "Email notifications are working! You'll get alerts when your games heat up.",
  });

  // Always log so rate limiting kicks in even on failed sends (otherwise an
  // attacker could spam errored sends).
  await db.insert(notificationLog).values({
    userId: session.user.id,
    eventType: "test_email",
    payload: { title: "4th Quarter - Test" },
    delivered: result.success,
    errorMessage: result.success ? null : result.error || "Email send failed",
  });

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error || "Failed to send email" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
