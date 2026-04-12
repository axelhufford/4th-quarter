import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { sendEmailNotification } from "@/lib/notifications/email";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error || "Failed to send email" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
