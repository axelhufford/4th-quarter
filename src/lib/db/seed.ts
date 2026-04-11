import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { teams } from "./schema";
import { NBA_TEAMS } from "../nba-teams";

async function seed() {
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql);

  console.log("Seeding NBA teams...");

  for (const team of NBA_TEAMS) {
    await db
      .insert(teams)
      .values({
        name: team.name,
        abbreviation: team.abbreviation,
        espnId: team.espnId,
        conference: team.conference,
        logoUrl: `https://a.espncdn.com/i/teamlogos/nba/500/${team.abbreviation.toLowerCase()}.png`,
      })
      .onConflictDoNothing();
  }

  console.log(`Seeded ${NBA_TEAMS.length} teams.`);
}

seed().catch(console.error);
