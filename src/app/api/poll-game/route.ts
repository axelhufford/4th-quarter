import { NextRequest, NextResponse } from "next/server";
import { fetchScoreboard } from "@/lib/espn/client";
import { parseEvent } from "@/lib/espn/parse";
import { db } from "@/lib/db/client";
import {
  gameStates,
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
import type { GameState } from "@/lib/espn/types";

export async function POST(req: NextRequest) {
  // Verify cron secret (used by both QStash and manual triggers)
  const secret =
    req.headers.get("x-cron-secret") ||
    req.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const gameId = searchParams.get("gameId");

  try {
    const scoreboard = await fetchScoreboard();
    const events = gameId
      ? scoreboard.events.filter((e) => e.id === gameId)
      : scoreboard.events;

    let totalNotifications = 0;

    // ── Parse events; handle scheduled/finished separately from active ones ──
    const activeGames: GameState[] = [];
    const finishedGameIds: string[] = [];
    const finishedGamesById = new Map<string, GameState>();
    for (const event of events) {
      try {
        const game = parseEvent(event);
        if (game.status === "finished") {
          finishedGameIds.push(game.gameId);
          finishedGamesById.set(game.gameId, game);
        } else if (game.status === "scheduled") {
          // skip — nothing to do here
        } else {
          activeGames.push(game);
        }
      } catch (err) {
        console.error("Failed to parse ESPN event", event.id, err);
      }
    }

    // Mark finished games as finished — bulk update by gameId list
    for (const fGameId of finishedGameIds) {
      const fGame = finishedGamesById.get(fGameId);
      if (!fGame) continue;
      await db
        .update(gameStates)
        .set({
          status: "finished",
          period: fGame.period,
          homeScore: fGame.homeScore,
          awayScore: fGame.awayScore,
          updatedAt: new Date(),
        })
        .where(eq(gameStates.gameId, fGame.gameId));
    }

    if (activeGames.length === 0) {
      return NextResponse.json({
        ok: true,
        gamesPolled: events.length,
        notificationsSent: 0,
      });
    }

    // ── Batch-fetch existing game states for all active games ────────────
    const activeGameIds = activeGames.map((g) => g.gameId);
    const existingStates = await db
      .select()
      .from(gameStates)
      .where(inArray(gameStates.gameId, activeGameIds));
    const stateByGameId = new Map(existingStates.map((s) => [s.gameId, s]));

    // Per-team max close_game threshold across users with the event enabled.
    // teamIds come from prevState (already in DB), so we collect those.
    const allDbTeamIds = new Set<number>();
    for (const s of existingStates) {
      if (s.homeTeamId !== null) allDbTeamIds.add(s.homeTeamId);
      if (s.awayTeamId !== null) allDbTeamIds.add(s.awayTeamId);
    }
    const thresholdRows = allDbTeamIds.size
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
          .where(inArray(userTeams.teamId, Array.from(allDbTeamIds)))
      : [];

    const maxThresholdByTeamId = new Map<number, number>();
    for (const row of thresholdRows) {
      const t = row.threshold ?? 5;
      const cur = maxThresholdByTeamId.get(row.teamId) ?? 0;
      if (t > cur) maxThresholdByTeamId.set(row.teamId, t);
    }

    // ── Per-game loop using map lookups ──────────────────────────────────
    for (const currentGame of activeGames) {
      const prevState = stateByGameId.get(currentGame.gameId);
      if (!prevState) continue;

      // Compute per-game close_game threshold (max across users on either team)
      const homeMax =
        prevState.homeTeamId !== null
          ? maxThresholdByTeamId.get(prevState.homeTeamId) ?? 5
          : 5;
      const awayMax =
        prevState.awayTeamId !== null
          ? maxThresholdByTeamId.get(prevState.awayTeamId) ?? 5
          : 5;
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
        currentGame,
        closeGameThreshold
      );

      if (triggered.length > 0) {
        const teamIds = [prevState.homeTeamId, prevState.awayTeamId].filter(
          (id): id is number => id !== null
        );

        // ── CAS: claim dedup keys atomically BEFORE sending ──
        const newSent = [
          ...oldSent,
          ...triggered.map((t) => dedupKey(t, currentGame.period)),
        ];

        const claimed = await db
          .update(gameStates)
          .set({
            status: currentGame.status,
            period: currentGame.period,
            homeScore: currentGame.homeScore,
            awayScore: currentGame.awayScore,
            notificationsSent: newSent,
            lastPolledAt: new Date(),
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(gameStates.gameId, currentGame.gameId),
              sql`${gameStates.notificationsSent}::text = ${JSON.stringify(oldSent)}::jsonb::text`
            )
          )
          .returning({ gameId: gameStates.gameId });

        if (claimed.length === 0) {
          // Another invocation beat us — skip to avoid duplicate sends
          continue;
        }

        if (teamIds.length > 0) {
          for (const eventType of triggered) {
            await sendNotificationsForEvent(
              eventType,
              teamIds,
              currentGame,
              prevState.gameId
            );
            totalNotifications++;
          }
        }
      } else {
        // No triggers, just update scores (no CAS needed)
        await db
          .update(gameStates)
          .set({
            status: currentGame.status,
            period: currentGame.period,
            homeScore: currentGame.homeScore,
            awayScore: currentGame.awayScore,
            lastPolledAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(gameStates.gameId, currentGame.gameId));
      }
    }

    return NextResponse.json({
      ok: true,
      gamesPolled: events.length,
      notificationsSent: totalNotifications,
    });
  } catch (error) {
    console.error("Poll-game error:", error);
    return NextResponse.json({ error: "Poll failed" }, { status: 500 });
  }
}

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

  // ── Push notifications ──────────────────────────────────────────────
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

  // ── Email notifications ─────────────────────────────────────────────
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
