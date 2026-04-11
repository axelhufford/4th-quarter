import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { teams, userTeams } from "@/lib/db/schema";
import { auth } from "@/lib/auth/auth";
import { eq } from "drizzle-orm";

export async function GET() {
  const allTeams = await db.select().from(teams).orderBy(teams.name);
  return NextResponse.json(allTeams);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { teamIds } = (await req.json()) as { teamIds: number[] };

  if (!Array.isArray(teamIds) || teamIds.length === 0) {
    return NextResponse.json({ error: "No teams selected" }, { status: 400 });
  }

  // Replace all team selections for this user
  await db.delete(userTeams).where(eq(userTeams.userId, session.user.id));
  await db.insert(userTeams).values(
    teamIds.map((teamId) => ({
      userId: session.user!.id!,
      teamId,
    }))
  );

  return NextResponse.json({ ok: true });
}
