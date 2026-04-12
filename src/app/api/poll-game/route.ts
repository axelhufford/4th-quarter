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
import { eq, and, or, inArray } from "drizzle-orm";
import { detectTriggers, dedupKey, EventType } from "@/lib/notifications/triggers";
import { buildNotification } from "@/lib/notifications/templates";
import { sendPushNotification } from "@/lib/notifications/web-push";
import { sendEmailNotification } from "@/lib/notifications/email";

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

    for (const event of events) {
      const currentGame = parseEvent(event);

      // Skip finished or scheduled games
      if (
        currentGame.status === "finished" ||
        currentGame.status === "scheduled"
      ) {
        // Update status in DB if finished
        if (currentGame.status === "finished") {
          await db
            .update(gameStates)
            .set({
              status: "finished",
              period: currentGame.period,
              homeScore: currentGame.homeScore,
              awayScore: currentGame.awayScore,
              updatedAt: new Date(),
            })
            .where(eq(gameStates.gameId, currentGame.gameId));
        }
        continue;
      }

      // Get previous state from DB
      const [prevState] = await db
        .select()
        .from(gameStates)
        .where(eq(gameStates.gameId, currentGame.gameId))
        .limit(1);

      if (!prevState) continue;

      // Detect which notification events should fire
      const triggered = detectTriggers(
        {
          status: prevState.status,
          period: prevState.period,
          homeScore: prevState.homeScore,
          awayScore: prevState.awayScore,
          notificationsSent: (prevState.notificationsSent as string[]) || [],
        },
        currentGame
      );

      if (triggered.length > 0) {
        // Find team IDs for this game
        const teamIds = [prevState.homeTeamId, prevState.awayTeamId].filter(
          (id): id is number => id !== null
        );

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

        // Update sent notifications list
        const newSent = [
          ...((prevState.notificationsSent as string[]) || []),
          ...triggered.map((t) => dedupKey(t, currentGame.period)),
        ];

        await db
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
          .where(eq(gameStates.gameId, currentGame.gameId));
      } else {
        // No triggers, just update scores
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
  game: import("@/lib/espn/types").GameState,
  gameId: string
) {
  // Find users subscribed to these teams who have this event type enabled
  const subscribedUsers = await db
    .select({
      userId: userTeams.userId,
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

  const userIds = [...new Set(subscribedUsers.map((u) => u.userId))];
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
