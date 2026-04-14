import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { notificationLog } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { redirect } from "next/navigation";
import Link from "next/link";

const PER_PAGE = 20;

const EVENT_LABELS: Record<string, string> = {
  game_starting: "Game Starting",
  "4th_quarter": "4th Quarter",
  halftime_ending: "2nd Half",
  close_game: "Close Game",
  overtime: "Overtime",
  game_ended: "Final Score",
};

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "America/New_York",
  });
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || "1", 10));
  const offset = (page - 1) * PER_PAGE;

  const logs = await db
    .select()
    .from(notificationLog)
    .where(eq(notificationLog.userId, session.user.id))
    .orderBy(desc(notificationLog.sentAt))
    .limit(PER_PAGE + 1)
    .offset(offset);

  const hasMore = logs.length > PER_PAGE;
  const entries = logs.slice(0, PER_PAGE);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">
          Notification History
        </h1>
        <p className="text-zinc-400">
          Recent alerts sent to you.
        </p>
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-16 text-zinc-500">
          No notifications yet. We&apos;ll notify you when your teams play!
        </div>
      ) : (
        <div className="space-y-2.5">
          {entries.map((entry) => {
            const payload = entry.payload as { title: string; body: string } | null;
            const isEmail = entry.eventType.endsWith("_email");
            const baseType = entry.eventType.replace(/_email$/, "");

            return (
              <div
                key={entry.id}
                className="bg-zinc-900 border border-zinc-800 rounded-lg p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium text-zinc-100 text-sm">
                      {payload?.title || baseType}
                    </div>
                    {payload?.body && (
                      <div className="text-sm text-zinc-400 mt-0.5">
                        {payload.body}
                      </div>
                    )}
                  </div>
                  <span
                    className={`shrink-0 text-xs px-2 py-0.5 rounded-full ${
                      entry.delivered
                        ? "bg-green-900/30 text-green-400"
                        : "bg-red-900/30 text-red-400"
                    }`}
                  >
                    {entry.delivered ? "Delivered" : "Failed"}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-2 text-xs text-zinc-500">
                  <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                    {isEmail ? "Email" : "Push"}
                  </span>
                  <span>{EVENT_LABELS[baseType] || baseType}</span>
                  <span>{formatRelativeTime(entry.sentAt)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {(page > 1 || hasMore) && (
        <div className="flex justify-between pt-2">
          {page > 1 ? (
            <Link
              href={`/history?page=${page - 1}`}
              className="text-sm text-orange-500 hover:text-orange-400 transition-colors"
            >
              &larr; Previous
            </Link>
          ) : (
            <span />
          )}
          {hasMore && (
            <Link
              href={`/history?page=${page + 1}`}
              className="text-sm text-orange-500 hover:text-orange-400 transition-colors"
            >
              Next &rarr;
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
