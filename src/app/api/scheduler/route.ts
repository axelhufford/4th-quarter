import { NextRequest, NextResponse } from "next/server";
import { fetchScoreboard } from "@/lib/espn/client";
import { parseEvent } from "@/lib/espn/parse";
import { db } from "@/lib/db/client";
import { gameStates, teams } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  // Verify cron secret
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const scoreboard = await fetchScoreboard();
    const results: string[] = [];

    for (const event of scoreboard.events) {
      const game = parseEvent(event);

      // Look up team IDs from our database
      const [homeTeam] = await db
        .select()
        .from(teams)
        .where(eq(teams.espnId, game.homeTeamEspnId))
        .limit(1);
      const [awayTeam] = await db
        .select()
        .from(teams)
        .where(eq(teams.espnId, game.awayTeamEspnId))
        .limit(1);

      // Upsert game state
      const existing = await db
        .select()
        .from(gameStates)
        .where(eq(gameStates.gameId, game.gameId))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(gameStates).values({
          gameId: game.gameId,
          homeTeamId: homeTeam?.id ?? null,
          awayTeamId: awayTeam?.id ?? null,
          status: game.status,
          period: game.period,
          homeScore: game.homeScore,
          awayScore: game.awayScore,
          gameDate: new Date(game.startTime).toISOString().split("T")[0],
          startTime: new Date(game.startTime),
          lastPolledAt: new Date(),
          notificationsSent: [],
          updatedAt: new Date(),
        });
        results.push(`Created: ${game.awayTeamAbbr} @ ${game.homeTeamAbbr}`);
      } else {
        await db
          .update(gameStates)
          .set({
            status: game.status,
            period: game.period,
            homeScore: game.homeScore,
            awayScore: game.awayScore,
            lastPolledAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(gameStates.gameId, game.gameId));
        results.push(`Updated: ${game.awayTeamAbbr} @ ${game.homeTeamAbbr}`);
      }
    }

    return NextResponse.json({
      ok: true,
      gamesProcessed: scoreboard.events.length,
      results,
    });
  } catch (error) {
    console.error("Scheduler error:", error);
    return NextResponse.json(
      { error: "Scheduler failed" },
      { status: 500 }
    );
  }
}
