import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { notificationPreferences, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { PreferenceForm } from "@/components/preference-form";
import { EmailToggle } from "@/components/email-toggle";
import { redirect } from "next/navigation";

export default async function PreferencesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const prefs = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, session.user.id));

  const [user] = await db
    .select({ emailNotifications: users.emailNotifications, email: users.email })
    .from(users)
    .where(eq(users.id, session.user.id));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-[-0.02em] text-white mb-1">Alert Settings</h1>
        <p className="text-zinc-400 leading-[1.55]">
          Choose which game moments trigger a notification.
        </p>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-white mb-4">
          Notification Method
        </h2>
        <EmailToggle
          enabled={user?.emailNotifications ?? false}
          email={user?.email ?? ""}
        />
      </div>

      <div>
        <h2 className="text-lg font-semibold text-white mb-4">
          Game Events
        </h2>
        <PreferenceForm
          preferences={prefs.map((p) => ({
            eventType: p.eventType,
            enabled: p.enabled,
            threshold: p.threshold,
          }))}
        />
      </div>
    </div>
  );
}
