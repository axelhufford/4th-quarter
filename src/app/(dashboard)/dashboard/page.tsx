import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { teams, userTeams, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { TeamPicker } from "@/components/team-picker";
import { NotificationBell } from "@/components/notification-bell";
import { EmailToggle } from "@/components/email-toggle";
import { redirect } from "next/navigation";
import { fetchScoreboard } from "@/lib/espn/client";
import { parseEvent } from "@/lib/espn/parse";

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

  const [user] = await db
    .select({ emailNotifications: users.emailNotifications, email: users.email })
    .from(users)
    .where(eq(users.id, session.user.id));

  // Get ESPN IDs of teams currently playing
  let liveEspnIds: string[] = [];
  try {
    const scoreboard = await fetchScoreboard();
    const liveStatuses = new Set(["in_progress", "halftime"]);
    for (const event of scoreboard.events) {
      const game = parseEvent(event);
      if (liveStatuses.has(game.status)) {
        liveEspnIds.push(game.homeTeamEspnId, game.awayTeamEspnId);
      }
    }
  } catch {
    // Don't break the dashboard if ESPN is down
  }

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
        <div className="space-y-4">
          <NotificationBell />
          <EmailToggle
            enabled={user?.emailNotifications ?? false}
            email={user?.email ?? ""}
          />
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-white mb-4">
          Your Teams
        </h2>
        <TeamPicker
          teams={allTeams}
          selectedIds={selectedIds}
          onSave={saveTeams}
          liveEspnIds={liveEspnIds}
        />
      </div>
    </div>
  );
}
