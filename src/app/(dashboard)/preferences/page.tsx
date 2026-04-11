import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { notificationPreferences } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { PreferenceForm } from "@/components/preference-form";
import { redirect } from "next/navigation";

export default async function PreferencesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const prefs = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, session.user.id));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Alert Settings</h1>
        <p className="text-zinc-400">
          Choose which game moments trigger a notification.
        </p>
      </div>

      <PreferenceForm
        preferences={prefs.map((p) => ({
          eventType: p.eventType,
          enabled: p.enabled,
          threshold: p.threshold,
        }))}
      />
    </div>
  );
}
