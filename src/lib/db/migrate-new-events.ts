import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { users, notificationPreferences } from "./schema";
import { eq } from "drizzle-orm";

/**
 * One-time migration: add "game_ended" and "overtime" notification preferences
 * for all existing users who don't have them yet.
 *
 * Run: npx tsx src/lib/db/migrate-new-events.ts
 */
async function migrate() {
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql);

  const allUsers = await db.select({ id: users.id }).from(users);
  console.log(`Found ${allUsers.length} users`);

  const newEvents = [
    { eventType: "game_ended", enabled: true },
    { eventType: "overtime", enabled: true },
  ];

  let inserted = 0;

  for (const user of allUsers) {
    const existing = await db
      .select({ eventType: notificationPreferences.eventType })
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, user.id));

    const existingTypes = new Set(existing.map((e) => e.eventType));

    for (const event of newEvents) {
      if (!existingTypes.has(event.eventType)) {
        await db.insert(notificationPreferences).values({
          userId: user.id,
          eventType: event.eventType,
          enabled: event.enabled,
        });
        inserted++;
        console.log(`  Added ${event.eventType} for user ${user.id}`);
      }
    }
  }

  console.log(`Done. Inserted ${inserted} new preference rows.`);
}

migrate().catch(console.error);
