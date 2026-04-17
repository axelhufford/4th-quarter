import { NextRequest, NextResponse } from "next/server";
import { fetchScoreboard } from "@/lib/espn/client";
import { parseEvent } from "@/lib/espn/parse";
import { db } from "@/lib/db/client";
import {
  gameStates,
  teams,
  userTeams,
  users,
  notificationPreferences,
  pushSubscriptions,
  notificationLog,
} from "@/lib/db/schema";
import { eq, and, inArray, sql } from "drizzle-orm";
import { detectTriggers, dedupKey, EventType } from "@/lib/notifications/triggers";
import { buildNotification } from "@/lib/notifications/templates";
import { sendPushNotification } from "@/lib/notifications/web-push";
import { sendEmailNotification } from "@/lib/notifications/email";
import { verifyCronSecret } from "@/lib/auth/cron";
import { isBoostEligible } from "@/lib/notifications/boost";
import { scheduleBoostPoll } from "@/lib/qstash/client";
import type { GameState } from "@/lib/espn/types";

export async function POST(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const scoreboard = await fetchScoreboard();
    const results: string[] = [];
    let totalNotifications = 0;

    // ── Batch phase: parse all events, then fetch teams/states/thresholds in 3 queries ──
    const allEspnIds = new Set<string>();
    const allGameIds: string[] = [];
    const parsedGames: GameState[] = [];
    for (const event of scoreboard.events) {
      try {
        const game = parseEvent(event);
        parsedGames.push(game);
        allEspnIds.add(game.homeTeamEspnId);
        allEspnIds.add(game.awayTeamEspnId);
        allGameIds.push(game.gameId);
      } catch (err) {
        console.error("Failed to parse ESPN event", event.id, err);
      }
    }

    const allTeams = allEspnIds.size
      ? await db
          .select()
          .from(teams)
          .where(inArray(teams.espnId, Array.from(allEspnIds)))
      : [];
    const teamByEspnId = new Map(allTeams.map((t) => [t.espnId, t]));

    const existingStates = allGameIds.length
      ? await db
          .select()
          .from(gameStates)
          .where(inArray(gameStates.gameId, allGameIds))
      : [];
    const stateByGameId = new Map(existingStates.map((s) => [s.gameId, s]));

    // Per-team max close_game threshold across users subscribed with the event enabled.
    // Used to decide WHEN to trigger; per-user filtering happens in sendNotificationsForEvent.
    const allDbTeamIds = allTeams.map((t) => t.id);
    const thresholdRows = allDbTeamIds.length
      ? await db
          .select({
            teamId: userTeams.teamId,
            threshold: notificationPreferences.threshold,
          })
          .from(userTeams)
          .innerJoin(
            notificationPreferences,
            and(
              eq(notificationPreferences.userId, userTeams.userId),
              eq(notificationPreferences.eventType, "close_game"),
              eq(notificationPreferences.enabled, true)
            )
          )
          .where(inArray(userTeams.teamId, allDbTeamIds))
      : [];

    const maxThresholdByTeamId = new Map<number, number>();
    for (const row of thresholdRows) {
      const t = row.threshold ?? 5;
      const cur = maxThresholdByTeamId.get(row.teamId) ?? 0;
      if (t > cur) maxThresholdByTeamId.set(row.teamId, t);
    }

    // Tracked team IDs among teams on today's slate (used later for boost dispatch).
    // Scoped to allDbTeamIds so we don't pull the full user_teams table.
    const trackedRows = allDbTeamIds.length
      ? await db
          .select({ teamId: userTeams.teamId })
          .from(userTeams)
          .where(inArray(userTeams.teamId, allDbTeamIds))
      : [];
    const trackedTeamIds = new Set(trackedRows.map((r) => r.teamId));

    // ── Per-game loop: now uses map lookups instead of queries ──────────
    for (const game of parsedGames) {
      const homeTeam = teamByEspnId.get(game.homeTeamEspnId);
      const awayTeam = teamByEspnId.get(game.awayTeamEspnId);
      const prevState = stateByGameId.get(game.gameId);

      if (!prevState) {
        // First time seeing this game — insert it
        await db
          .insert(gameStates)
          .values({
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
          })
          .onConflictDoNothing();
        results.push(`Created: ${game.awayTeamAbbr} @ ${game.homeTeamAbbr}`);
        continue;
      }

      // Compute the per-game close_game threshold (max across users on either team).
      // Default of 5 ensures we still trigger for the global default if no users have prefs set.
      const homeMax = homeTeam ? maxThresholdByTeamId.get(homeTeam.id) ?? 5 : 5;
      const awayMax = awayTeam ? maxThresholdByTeamId.get(awayTeam.id) ?? 5 : 5;
      const closeGameThreshold = Math.max(homeMax, awayMax, 5);

      const oldSent = (prevState.notificationsSent as string[]) || [];
      const triggered = detectTriggers(
        {
          status: prevState.status,
          period: prevState.period,
          homeScore: prevState.homeScore,
          awayScore: prevState.awayScore,
          notificationsSent: oldSent,
        },
        game,
        closeGameThreshold
      );

      if (triggered.length > 0) {
        const teamIds = [prevState.homeTeamId, prevState.awayTeamId].filter(
          (id): id is number => id !== null
        );

        // ── Compare-and-swap: claim dedup keys atomically BEFORE sending ──
        // If another concurrent invocation already advanced notificationsSent,
        // this update finds zero rows and we skip — preventing duplicates.
        const newSent = [
          ...oldSent,
          ...triggered.map((t) => dedupKey(t, game.period)),
        ];

        const claimed = await db
          .update(gameStates)
          .set({
            status: game.status,
            period: game.period,
            homeScore: game.homeScore,
            awayScore: game.awayScore,
            notificationsSent: newSent,
            lastPolledAt: new Date(),
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(gameStates.gameId, game.gameId),
              sql`${gameStates.notificationsSent} = ${JSON.stringify(oldSent)}::jsonb`
            )
          )
          .returning({ gameId: gameStates.gameId });

        if (claimed.length === 0) {
          results.push(
            `Skipped (concurrent run): ${game.awayTeamAbbr} @ ${game.homeTeamAbbr}`
          );
          continue;
        }

        if (teamIds.length > 0) {
          for (const eventType of triggered) {
            await sendNotificationsForEvent(
              eventType,
              teamIds,
              game,
              prevState.gameId
            );
            totalNotifications++;
          }
        }

        results.push(
          `Triggered [${triggered.join(", ")}]: ${game.awayTeamAbbr} @ ${game.homeTeamAbbr}`
        );
      } else {
        // No triggers — just update scores/status (no CAS needed)
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

    // ── Adaptive boost: kick off fast per-game polls for late-game tracked games ──
    // Only dispatch the FIRST hop of the chain here; poll-game re-schedules itself.
    // Failures are logged and swallowed — the 5-min cron is the safety net.
    const boostedGameIds: string[] = [];
    for (const game of parsedGames) {
      if (!isBoostEligible(game)) continue;

      const homeTeam = teamByEspnId.get(game.homeTeamEspnId);
      const awayTeam = teamByEspnId.get(game.awayTeamEspnId);
      const homeTracked = homeTeam ? trackedTeamIds.has(homeTeam.id) : false;
      const awayTracked = awayTeam ? trackedTeamIds.has(awayTeam.id) : false;
      if (!homeTracked && !awayTracked) continue;

      try {
        await scheduleBoostPoll(game.gameId, 0);
        boostedGameIds.push(game.gameId);
      } catch (err) {
        console.error(
          `Failed to schedule boost poll for ${game.gameId}:`,
          err
        );
      }
    }
    if (boostedGameIds.length > 0) {
      results.push(`Boosted ${boostedGameIds.length} game(s)`);
    }

    return NextResponse.json({
      ok: true,
      gamesProcessed: scoreboard.events.length,
      notificationsSent: totalNotifications,
      boostedGames: boostedGameIds.length,
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

// ── Send push + email notifications ────────────────────────────────────
async function sendNotificationsForEvent(
  eventType: EventType,
  teamIds: number[],
  game: GameState,
  gameId: string
) {
  // Find users subscribed to these teams who have this event type enabled.
  // Pull threshold so we can per-user filter close_game by point differential.
  const subscribedUsers = await db
    .select({
      userId: userTeams.userId,
      threshold: notificationPreferences.threshold,
    })
    .from(userTeams)
    .innerJoin(
      notificationPreferences,
      and(
        eq(notificationPreferences.userId, userTeams.userId),
        eq(notificationPreferences.eventType, eventType),
        eq(notificationPreferences.enabled, true)
      )
    )
    .where(inArray(userTeams.teamId, teamIds));

  if (subscribedUsers.length === 0) return;

  // Per-user filtering: for close_game, only notify users whose threshold ≥ diff
  let filteredUsers = subscribedUsers;
  if (eventType === "close_game") {
    const diff = Math.abs(game.homeScore - game.awayScore);
    filteredUsers = subscribedUsers.filter((u) => diff <= (u.threshold ?? 5));
    if (filteredUsers.length === 0) return;
  }

  const userIds = [...new Set(filteredUsers.map((u) => u.userId))];
  const payload = buildNotification(eventType, game);

  // Push notifications
  const subs = await db
    .select()
    .from(pushSubscriptions)
    .where(inArray(pushSubscriptions.userId, userIds));

  const batchSize = 50;
  for (let i = 0; i < subs.length; i += batchSize) {
    const batch = subs.slice(i, i + batchSize);
    await Promise.allSettled(
      batch.map(async (sub) => {
        const result = await sendPushNotification(
          {
            endpoint: sub.endpoint,
            p256dhKey: sub.p256dhKey,
            authKey: sub.authKey,
          },
          payload
        );

        await db.insert(notificationLog).values({
          userId: sub.userId,
          gameId,
          eventType,
          payload,
          delivered: result.success,
          errorMessage: result.success ? null : "Push delivery failed",
        });

        if (result.gone) {
          await db
            .delete(pushSubscriptions)
            .where(eq(pushSubscriptions.id, sub.id));
        }

        return result;
      })
    );
  }

  // Email notifications
  const emailUsers = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(
      and(
        inArray(users.id, userIds),
        eq(users.emailNotifications, true)
      )
    );

  for (const user of emailUsers) {
    const result = await sendEmailNotification(user.email, {
      title: payload.title,
      body: payload.body,
    });

    await db.insert(notificationLog).values({
      userId: user.id,
      gameId,
      eventType: `${eventType}_email`,
      payload,
      delivered: result.success,
      errorMessage: result.success ? null : "Email delivery failed",
    });
  }
}
