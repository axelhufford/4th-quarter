import Link from "next/link";
import { fetchScoreboard } from "@/lib/espn/client";
import { Logo, PulseDot } from "@/components/logo";
import { TEAM_COLORS } from "@/lib/nba-teams";
import { getLiveGameCount } from "@/lib/espn/live-count";

interface Game {
  id: string;
  awayAbbr: string;
  awayScore: number;
  homeAbbr: string;
  homeScore: number;
  status: "scheduled" | "in_progress" | "halftime" | "finished";
  period: number;
  clock: string;
  startTime: string;
  name: string;
}

function parseGame(event: import("@/lib/espn/types").ESPNEvent): Game {
  const comp = event.competitions[0];
  const home = comp.competitors.find((c) => c.homeAway === "home")!;
  const away = comp.competitors.find((c) => c.homeAway === "away")!;

  const statusName = event.status.type.name;
  const completed = event.status.type.completed;

  let status: Game["status"];
  if (completed || statusName === "STATUS_FINAL") {
    status = "finished";
  } else if (statusName === "STATUS_HALFTIME") {
    status = "halftime";
  } else if (
    statusName === "STATUS_IN_PROGRESS" ||
    statusName === "STATUS_END_PERIOD"
  ) {
    status = "in_progress";
  } else {
    status = "scheduled";
  }

  return {
    id: event.id,
    awayAbbr: away.team.abbreviation,
    awayScore: parseInt(away.score, 10) || 0,
    homeAbbr: home.team.abbreviation,
    homeScore: parseInt(home.score, 10) || 0,
    status,
    period: event.status.period,
    clock: event.status.displayClock,
    startTime: event.date,
    name: `${away.team.displayName} at ${home.team.displayName}`,
  };
}

function formatDate(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

function dayLabel(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === tomorrow.toDateString()) return "Tomorrow";

  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
    timeZoneName: "short",
  });
}

function periodLabel(period: number): string {
  if (period <= 4) return `${period}${["st", "nd", "rd", "th"][period - 1]}`;
  return `OT${period - 4}`;
}

interface DayGames {
  dateKey: string;
  label: string;
  games: Game[];
}

export default async function ScoresPage() {
  let days: DayGames[] = [];
  let liveCount = 0;
  let error = false;

  try {
    const todayData = await fetchScoreboard();
    const todayGames = todayData.events.map(parseGame);
    liveCount = await getLiveGameCount();

    const hasLive = todayGames.some(
      (g) => g.status === "in_progress" || g.status === "halftime"
    );

    const todayStr = new Date().toISOString().slice(0, 10);

    if (todayGames.length > 0) {
      const sorted = [...todayGames].sort((a, b) => {
        const order = { in_progress: 0, halftime: 0, scheduled: 1, finished: 2 };
        return order[a.status] - order[b.status];
      });
      days.push({ dateKey: todayStr, label: "Today", games: sorted });
    }

    // If no live games, fetch upcoming days
    if (!hasLive) {
      for (let i = 1; i <= 3; i++) {
        try {
          const dateStr = formatDate(i);
          const data = await fetchScoreboard(dateStr);
          if (data.events.length > 0) {
            const games = data.events.map(parseGame);
            const label = dayLabel(dateStr.slice(0, 4) + "-" + dateStr.slice(4, 6) + "-" + dateStr.slice(6, 8));
            days.push({ dateKey: dateStr, label, games });
          }
        } catch {
          // Skip days that fail
        }
      }
    }
  } catch {
    error = true;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-7 py-5 border-b border-zinc-800">
        <Link href="/" className="flex items-center gap-2.5">
          <Logo size={26} />
          <span className="font-medium text-[15px] tracking-tight">4th Quarter</span>
        </Link>
        <div className="flex items-center gap-4">
          {liveCount > 0 && (
            <div className="hidden sm:flex items-center gap-2 text-xs text-zinc-400">
              <PulseDot />
              {liveCount} {liveCount === 1 ? "game" : "games"} live
            </div>
          )}
          <Link
            href="/login"
            className="border border-zinc-800 text-white px-3.5 py-1.5 rounded-md text-[13px] hover:bg-zinc-900 transition-colors"
          >
            Sign in
          </Link>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-5 py-8">
        <h1 className="text-2xl font-bold mb-1">Scores & Schedule</h1>
        <p className="text-zinc-400 text-sm mb-8">Live scores, today&apos;s results, and upcoming games.</p>

        {error ? (
          <div className="text-center py-16 text-zinc-500">
            Couldn&apos;t load scores right now. Try refreshing the page.
          </div>
        ) : days.length === 0 ? (
          <div className="text-center py-16 text-zinc-500">
            No games scheduled. Check back during the season.
          </div>
        ) : (
          <div className="space-y-8">
            {days.map((day) => (
              <section key={day.dateKey}>
                <h2 className="text-sm font-medium text-zinc-400 mb-3 tracking-wide uppercase">
                  {day.label}
                </h2>
                <div className="space-y-2.5">
                  {day.games.map((game) => (
                    <GameCard key={game.id} game={game} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function GameCard({ game }: { game: Game }) {
  const isLive = game.status === "in_progress" || game.status === "halftime";
  const isFinished = game.status === "finished";

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-[10px] px-5 py-4 flex items-center justify-between relative tabular-nums">
      {/* Status badge */}
      {isLive && (
        <div className="absolute top-2 left-3 flex items-center gap-1.5 text-[10px] text-orange-500 tracking-[0.08em]">
          <PulseDot size={6} />
          {game.status === "halftime" ? "HALF" : "LIVE"}
        </div>
      )}
      {isFinished && (
        <div className="absolute top-2 left-3 text-[10px] text-zinc-500 tracking-[0.08em]">
          FINAL
        </div>
      )}

      {/* Away team */}
      <div className={`flex items-center gap-3 ${isLive || isFinished ? "mt-3" : ""}`}>
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-semibold"
          style={{ backgroundColor: TEAM_COLORS[game.awayAbbr] || "#3f3f46" }}
        >
          {game.awayAbbr}
        </div>
        {!isLive && game.status === "scheduled" ? null : (
          <span className={`text-xl font-medium tracking-tight ${isFinished && game.awayScore < game.homeScore ? "text-zinc-500" : ""}`}>
            {game.awayScore}
          </span>
        )}
      </div>

      {/* Center */}
      <div className={`text-center ${isLive || isFinished ? "mt-3" : ""}`}>
        {isLive && (
          <>
            <div className="text-[11px] text-orange-500 tracking-[0.08em] mb-0.5">
              {game.status === "halftime"
                ? "HALFTIME"
                : `${periodLabel(game.period)} · ${game.clock}`}
            </div>
          </>
        )}
        {game.status === "scheduled" && (
          <div className="text-sm text-zinc-400">{formatTime(game.startTime)}</div>
        )}
        {isFinished && (
          <div className="text-[11px] text-zinc-500 tracking-[0.08em]">
            {game.period > 4 ? `FINAL · ${periodLabel(game.period)}` : ""}
          </div>
        )}
      </div>

      {/* Home team */}
      <div className={`flex items-center gap-3 ${isLive || isFinished ? "mt-3" : ""}`}>
        {!isLive && game.status === "scheduled" ? null : (
          <span className={`text-xl font-medium tracking-tight ${isFinished && game.homeScore < game.awayScore ? "text-zinc-500" : ""}`}>
            {game.homeScore}
          </span>
        )}
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-semibold"
          style={{ backgroundColor: TEAM_COLORS[game.homeAbbr] || "#3f3f46" }}
        >
          {game.homeAbbr}
        </div>
      </div>
    </div>
  );
}
