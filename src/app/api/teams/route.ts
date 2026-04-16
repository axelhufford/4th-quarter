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

  let body: { teamIds?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { teamIds } = body as { teamIds: number[] };

  if (!Array.isArray(teamIds)) {
    return NextResponse.json({ error: "teamIds must be an array" }, { status: 400 });
  }

  // Validate every ID is a positive integer
  if (!teamIds.every((id) => Number.isInteger(id) && id > 0)) {
    return NextResponse.json({ error: "Invalid team IDs" }, { status: 400 });
  }

  // Atomic: delete + insert in a transaction so a failed insert
  // doesn't leave the user with zero team selections
  await db.transaction(async (tx) => {
    await tx.delete(userTeams).where(eq(userTeams.userId, session.user!.id!));
    if (teamIds.length > 0) {
      await tx.insert(userTeams).values(
        teamIds.map((teamId) => ({
          userId: session.user!.id!,
          teamId,
        }))
      );
    }
  });

  return NextResponse.json({ ok: true });
}
