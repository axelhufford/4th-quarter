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
import { eq, and, inArray } from "drizzle-orm";
import { detectTriggers, dedupKey, EventType } from "@/lib/notifications/triggers";
import { buildNotification } from "@/lib/notifications/templates";
import { sendPushNotification } from "@/lib/notifications/web-push";
import { sendEmailNotification } from "@/lib/notifications/email";

export async function POST(req: NextRequest) {
  // Verify cron secret
  const secret =
    req.headers.get("x-cron-secret") ||
    req.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const scoreboard = await fetchScoreboard();
    const results: string[] = [];
    let totalNotifications = 0;

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

      // Get previous state from DB
      const [prevState] = await db
        .select()
        .from(gameStates)
        .where(eq(gameStates.gameId, game.gameId))
        .limit(1);

      if (!prevState) {
        // First time seeing this game — insert it
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
        continue;
      }

      // ── Detect triggers BEFORE updating state ──────────────────────
      const triggered = detectTriggers(
        {
          status: prevState.status,
          period: prevState.period,
          homeScore: prevState.homeScore,
          awayScore: prevState.awayScore,
          notificationsSent: (prevState.notificationsSent as string[]) || [],
        },
        game
      );

      if (triggered.length > 0) {
        const teamIds = [prevState.homeTeamId, prevState.awayTeamId].filter(
          (id): id is number => id !== null
        );

        if (teamIds.length > 0) {
          for (const eventType of triggered) {
            await sendNotificationsForEvent(eventType, teamIds, game, prevState.gameId);
            totalNotifications++;
          }
        }

        // Update state with new notifications sent
        const newSent = [
          ...((prevState.notificationsSent as string[]) || []),
          ...triggered.map((t) => dedupKey(t, game.period)),
        ];

        await db
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
          .where(eq(gameStates.gameId, game.gameId));

        results.push(
          `Triggered [${triggered.join(", ")}]: ${game.awayTeamAbbr} @ ${game.homeTeamAbbr}`
        );
      } else {
        // No triggers — just update scores/status
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
      notificationsSent: totalNotifications,
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
  game: import("@/lib/espn/types").GameState,
  gameId: string
) {
  // Find users subscribed to these teams who have this event type enabled
  const subscribedUsers = await db
    .select({ userId: userTeams.userId })
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

  const userIds = [...new Set(subscribedUsers.map((u) => u.userId))];
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
