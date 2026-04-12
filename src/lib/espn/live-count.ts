import { fetchScoreboard } from "./client";
import { parseEvent } from "./parse";

/**
 * Returns the number of NBA games currently in progress.
 * Gracefully returns 0 on any error (don't break the page if ESPN is down).
 */
export async function getLiveGameCount(): Promise<number> {
  try {
    const scoreboard = await fetchScoreboard();
    const liveStatuses = new Set(["in_progress", "halftime"]);
    return scoreboard.events.filter((e) => {
      const game = parseEvent(e);
      return liveStatuses.has(game.status);
    }).length;
  } catch {
    return 0;
  }
}
