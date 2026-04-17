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
  if (!session?.user?.id) {
    // Throw so the client's try/catch surfaces the error instead of
    // showing "Saved!" on a silent no-op.
    throw new Error("Not authenticated");
  }

  // Validate: must be an array of positive integers
  if (
    !Array.isArray(teamIds) ||
    !teamIds.every((id) => Number.isInteger(id) && id > 0)
  ) {
    throw new Error("Invalid team IDs");
  }

  // Dedupe and cap — there are only 30 NBA teams
  const uniqueIds = Array.from(new Set(teamIds)).slice(0, 30);
  const userId = session.user.id;

  // Atomic via db.batch() — neon-http doesn't support db.transaction(),
  // but batch runs all statements in a single server-side transaction.
  if (uniqueIds.length > 0) {
    await db.batch([
      db.delete(userTeams).where(eq(userTeams.userId, userId)),
      db
        .insert(userTeams)
        .values(uniqueIds.map((teamId) => ({ userId, teamId }))),
    ]);
  } else {
    // Clearing all teams — single statement, no batch needed
    await db.delete(userTeams).where(eq(userTeams.userId, userId));
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
