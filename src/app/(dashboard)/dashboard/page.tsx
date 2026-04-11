import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { teams, userTeams } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { TeamPicker } from "@/components/team-picker";
import { NotificationBell } from "@/components/notification-bell";
import { redirect } from "next/navigation";

async function saveTeams(teamIds: number[]) {
  "use server";
  const session = await auth();
  if (!session?.user?.id) return;

  await db.delete(userTeams).where(eq(userTeams.userId, session.user.id));
  if (teamIds.length > 0) {
    await db.insert(userTeams).values(
      teamIds.map((teamId) => ({
        userId: session.user!.id!,
        teamId,
      }))
    );
  }
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const allTeams = await db.select().from(teams).orderBy(teams.name);
  const selectedTeams = await db
    .select({ teamId: userTeams.teamId })
    .from(userTeams)
    .where(eq(userTeams.userId, session.user.id));

  const selectedIds = selectedTeams.map((t) => t.teamId);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">
          Welcome{session.user.name ? `, ${session.user.name.split(" ")[0]}` : ""}
        </h1>
        <p className="text-zinc-400">
          Pick your teams and we'll notify you when the action heats up.
        </p>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-white mb-4">
          Enable Notifications
        </h2>
        <NotificationBell />
      </div>

      <div>
        <h2 className="text-lg font-semibold text-white mb-4">
          Your Teams
        </h2>
        <TeamPicker
          teams={allTeams}
          selectedIds={selectedIds}
          onSave={saveTeams}
        />
      </div>
    </div>
  );
}
